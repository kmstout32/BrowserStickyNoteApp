using Microsoft.AspNetCore.Mvc;
using CalendarSyncAPI.Models;
using CalendarSyncAPI.Data;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Calendar.v3;
using System.Text;

namespace CalendarSyncAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext context, IConfiguration configuration, ILogger<AuthController> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    // GET: api/auth/google/url
    [HttpGet("google/url")]
    public IActionResult GetGoogleAuthUrl([FromQuery] string userId)
    {
        try
        {
            var clientId = _configuration["GoogleCalendar:ClientId"];
            var redirectUri = _configuration["GoogleCalendar:RedirectUri"];

            var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
                $"client_id={Uri.EscapeDataString(clientId ?? "")}" +
                $"&redirect_uri={Uri.EscapeDataString(redirectUri ?? "")}" +
                $"&response_type=code" +
                $"&scope={Uri.EscapeDataString("https://www.googleapis.com/auth/calendar")}" +
                $"&access_type=offline" +
                $"&prompt=consent" +
                $"&state={Uri.EscapeDataString(userId)}";

            return Ok(new { authUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Google auth URL");
            return StatusCode(500, new { error = "Failed to generate auth URL" });
        }
    }

    // GET: api/auth/google/callback
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string code, [FromQuery] string state)
    {
        try
        {
            var userId = state; // userId passed as state parameter
            var clientId = _configuration["GoogleCalendar:ClientId"];
            var clientSecret = _configuration["GoogleCalendar:ClientSecret"];
            var redirectUri = _configuration["GoogleCalendar:RedirectUri"];

            // Exchange code for tokens
            using var httpClient = new HttpClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("client_id", clientId ?? ""),
                new KeyValuePair<string, string>("client_secret", clientSecret ?? ""),
                new KeyValuePair<string, string>("redirect_uri", redirectUri ?? ""),
                new KeyValuePair<string, string>("grant_type", "authorization_code")
            });

            var response = await httpClient.PostAsync("https://oauth2.googleapis.com/token", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Google token exchange failed: {Response}", responseContent);
                return BadRequest(new { error = "Token exchange failed" });
            }

            var tokenResponse = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
            if (tokenResponse == null || !tokenResponse.ContainsKey("access_token"))
            {
                return BadRequest(new { error = "Invalid token response" });
            }

            // Store tokens in database
            var existingToken = await _context.UserCalendarTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == "Google");

            if (existingToken != null)
            {
                existingToken.AccessToken = tokenResponse["access_token"].ToString() ?? "";
                existingToken.RefreshToken = tokenResponse.ContainsKey("refresh_token")
                    ? tokenResponse["refresh_token"].ToString() ?? existingToken.RefreshToken
                    : existingToken.RefreshToken;
                existingToken.ExpiresAt = DateTime.UtcNow.AddSeconds(
                    int.Parse(tokenResponse.ContainsKey("expires_in")
                        ? tokenResponse["expires_in"].ToString() ?? "3600"
                        : "3600"));
                existingToken.UpdatedAt = DateTime.UtcNow;
                existingToken.IsActive = true;
            }
            else
            {
                var newToken = new UserCalendarToken
                {
                    UserId = userId,
                    Provider = "Google",
                    AccessToken = tokenResponse["access_token"].ToString() ?? "",
                    RefreshToken = tokenResponse.ContainsKey("refresh_token")
                        ? tokenResponse["refresh_token"].ToString() ?? ""
                        : "",
                    ExpiresAt = DateTime.UtcNow.AddSeconds(
                        int.Parse(tokenResponse.ContainsKey("expires_in")
                            ? tokenResponse["expires_in"].ToString() ?? "3600"
                            : "3600")),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                _context.UserCalendarTokens.Add(newToken);
            }

            await _context.SaveChangesAsync();

            // Redirect back to frontend with success
            return Redirect($"http://localhost:3000?googleAuth=success");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Google callback");
            return Redirect($"http://localhost:3000?googleAuth=error");
        }
    }

    // GET: api/auth/microsoft/url
    [HttpGet("microsoft/url")]
    public IActionResult GetMicrosoftAuthUrl([FromQuery] string userId)
    {
        try
        {
            var clientId = _configuration["MicrosoftGraph:ClientId"];
            var redirectUri = _configuration["MicrosoftGraph:RedirectUri"];
            var tenantId = _configuration["MicrosoftGraph:TenantId"] ?? "common";
            var scopes = _configuration["MicrosoftGraph:Scopes"] ?? "Calendars.ReadWrite offline_access";

            var authUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize?" +
                $"client_id={Uri.EscapeDataString(clientId ?? "")}" +
                $"&response_type=code" +
                $"&redirect_uri={Uri.EscapeDataString(redirectUri ?? "")}" +
                $"&response_mode=query" +
                $"&scope={Uri.EscapeDataString(scopes)}" +
                $"&state={Uri.EscapeDataString(userId)}";

            return Ok(new { authUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Microsoft auth URL");
            return StatusCode(500, new { error = "Failed to generate auth URL" });
        }
    }

    // GET: api/auth/microsoft/callback
    [HttpGet("microsoft/callback")]
    public async Task<IActionResult> MicrosoftCallback([FromQuery] string code, [FromQuery] string state)
    {
        try
        {
            var userId = state;
            var clientId = _configuration["MicrosoftGraph:ClientId"];
            var clientSecret = _configuration["MicrosoftGraph:ClientSecret"];
            var redirectUri = _configuration["MicrosoftGraph:RedirectUri"];
            var tenantId = _configuration["MicrosoftGraph:TenantId"] ?? "common";

            // Exchange code for tokens
            using var httpClient = new HttpClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("client_id", clientId ?? ""),
                new KeyValuePair<string, string>("client_secret", clientSecret ?? ""),
                new KeyValuePair<string, string>("redirect_uri", redirectUri ?? ""),
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("scope", _configuration["MicrosoftGraph:Scopes"] ?? "Calendars.ReadWrite offline_access")
            });

            var response = await httpClient.PostAsync(
                $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token",
                content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Microsoft token exchange failed: {Response}", responseContent);
                return BadRequest(new { error = "Token exchange failed" });
            }

            var tokenResponse = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
            if (tokenResponse == null || !tokenResponse.ContainsKey("access_token"))
            {
                return BadRequest(new { error = "Invalid token response" });
            }

            // Store tokens in database
            var existingToken = await _context.UserCalendarTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == "Microsoft");

            if (existingToken != null)
            {
                existingToken.AccessToken = tokenResponse["access_token"].ToString() ?? "";
                existingToken.RefreshToken = tokenResponse.ContainsKey("refresh_token")
                    ? tokenResponse["refresh_token"].ToString() ?? existingToken.RefreshToken
                    : existingToken.RefreshToken;
                existingToken.ExpiresAt = DateTime.UtcNow.AddSeconds(
                    int.Parse(tokenResponse.ContainsKey("expires_in")
                        ? tokenResponse["expires_in"].ToString() ?? "3600"
                        : "3600"));
                existingToken.UpdatedAt = DateTime.UtcNow;
                existingToken.IsActive = true;
            }
            else
            {
                var newToken = new UserCalendarToken
                {
                    UserId = userId,
                    Provider = "Microsoft",
                    AccessToken = tokenResponse["access_token"].ToString() ?? "",
                    RefreshToken = tokenResponse.ContainsKey("refresh_token")
                        ? tokenResponse["refresh_token"].ToString() ?? ""
                        : "",
                    ExpiresAt = DateTime.UtcNow.AddSeconds(
                        int.Parse(tokenResponse.ContainsKey("expires_in")
                            ? tokenResponse["expires_in"].ToString() ?? "3600"
                            : "3600")),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                _context.UserCalendarTokens.Add(newToken);
            }

            await _context.SaveChangesAsync();

            // Redirect back to frontend with success
            return Redirect($"http://localhost:3000?microsoftAuth=success");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Microsoft callback");
            return Redirect($"http://localhost:3000?microsoftAuth=error");
        }
    }

    // GET: api/auth/status
    [HttpGet("status")]
    public async Task<IActionResult> GetAuthStatus([FromQuery] string userId)
    {
        var googleToken = await _context.UserCalendarTokens
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == "Google" && t.IsActive);
        var microsoftToken = await _context.UserCalendarTokens
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == "Microsoft" && t.IsActive);

        return Ok(new
        {
            google = googleToken != null,
            microsoft = microsoftToken != null
        });
    }

    // POST: api/auth/disconnect
    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect([FromBody] DisconnectRequest request)
    {
        var token = await _context.UserCalendarTokens
            .FirstOrDefaultAsync(t => t.UserId == request.UserId && t.Provider == request.Provider);

        if (token != null)
        {
            token.IsActive = false;
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }
}

public record DisconnectRequest(string UserId, string Provider);
