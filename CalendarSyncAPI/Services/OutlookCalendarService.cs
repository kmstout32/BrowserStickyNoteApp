using Microsoft.Graph;
using Microsoft.Graph.Models;
using Azure.Identity;
using CalendarSyncAPI.Models;
using CalendarSyncAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace CalendarSyncAPI.Services;

public class OutlookCalendarService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OutlookCalendarService> _logger;

    public OutlookCalendarService(AppDbContext context, IConfiguration configuration, ILogger<OutlookCalendarService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GraphServiceClient?> GetGraphClientAsync(string userId)
    {
        var token = await _context.UserCalendarTokens
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == "Microsoft" && t.IsActive);

        if (token == null) return null;

        // Check if token needs refresh
        if (token.ExpiresAt <= DateTime.UtcNow.AddMinutes(5))
        {
            await RefreshTokenAsync(token);
        }

        var authProvider = new DelegateAuthenticationProvider(async (request) =>
        {
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.AccessToken);
            await Task.CompletedTask;
        });

        return new GraphServiceClient(authProvider);
    }

    public async Task<string?> SyncTodoToOutlookAsync(TodoItem todo, string userId)
    {
        try
        {
            var graphClient = await GetGraphClientAsync(userId);
            if (graphClient == null)
            {
                _logger.LogWarning("No Graph client available for user {UserId}", userId);
                return null;
            }

            Event calendarEvent;

            // Check if event already exists
            if (!string.IsNullOrEmpty(todo.OutlookEventId))
            {
                // Update existing event
                calendarEvent = CreateEventFromTodo(todo);
                await graphClient.Me.Events[todo.OutlookEventId].PatchAsync(calendarEvent);
                _logger.LogInformation("Updated Outlook Calendar event {EventId}", todo.OutlookEventId);
                return todo.OutlookEventId;
            }
            else
            {
                // Create new event
                calendarEvent = CreateEventFromTodo(todo);
                var createdEvent = await graphClient.Me.Events.PostAsync(calendarEvent);
                _logger.LogInformation("Created new Outlook Calendar event {EventId}", createdEvent?.Id);
                return createdEvent?.Id;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing todo {TodoId} to Outlook Calendar", todo.Id);
            return null;
        }
    }

    public async Task<bool> DeleteFromOutlookAsync(string eventId, string userId)
    {
        try
        {
            var graphClient = await GetGraphClientAsync(userId);
            if (graphClient == null) return false;

            await graphClient.Me.Events[eventId].DeleteAsync();
            _logger.LogInformation("Deleted Outlook Calendar event {EventId}", eventId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting event {EventId} from Outlook Calendar", eventId);
            return false;
        }
    }

    private Event CreateEventFromTodo(TodoItem todo)
    {
        var start = todo.DueDate ?? DateTime.Now.AddDays(1);
        var end = start.AddHours(1);

        var calendarEvent = new Event
        {
            Subject = todo.Text,
            Body = new ItemBody
            {
                ContentType = BodyType.Text,
                Content = $"Priority: {todo.Priority ?? "Medium"}{(todo.Completed ? "\n(Completed)" : "")}"
            },
            Start = new DateTimeTimeZone
            {
                DateTime = start.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = "UTC"
            },
            End = new DateTimeTimeZone
            {
                DateTime = end.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = "UTC"
            },
            IsReminderOn = true,
            ReminderMinutesBeforeStart = 15
        };

        // Set categories based on priority
        calendarEvent.Categories = new List<string>();
        if (!string.IsNullOrEmpty(todo.Priority))
        {
            calendarEvent.Categories.Add($"Priority: {todo.Priority}");
        }
        if (todo.Completed)
        {
            calendarEvent.Categories.Add("Completed");
        }

        return calendarEvent;
    }

    private async Task RefreshTokenAsync(UserCalendarToken token)
    {
        try
        {
            var clientId = _configuration["MicrosoftGraph:ClientId"] ?? string.Empty;
            var clientSecret = _configuration["MicrosoftGraph:ClientSecret"] ?? string.Empty;
            var tenantId = _configuration["MicrosoftGraph:TenantId"] ?? "common";

            // Use Azure.Identity to refresh the token
            using var httpClient = new HttpClient();
            var tokenEndpoint = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";

            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("refresh_token", token.RefreshToken),
                new KeyValuePair<string, string>("grant_type", "refresh_token"),
                new KeyValuePair<string, string>("scope", _configuration["MicrosoftGraph:Scopes"] ?? "Calendars.ReadWrite offline_access")
            });

            var response = await httpClient.PostAsync(tokenEndpoint, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var tokenResponse = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
                if (tokenResponse != null && tokenResponse.ContainsKey("access_token"))
                {
                    token.AccessToken = tokenResponse["access_token"].ToString() ?? token.AccessToken;
                    if (tokenResponse.ContainsKey("refresh_token"))
                    {
                        token.RefreshToken = tokenResponse["refresh_token"].ToString() ?? token.RefreshToken;
                    }
                    if (tokenResponse.ContainsKey("expires_in"))
                    {
                        var expiresIn = int.Parse(tokenResponse["expires_in"].ToString() ?? "3600");
                        token.ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                    }
                    token.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Refreshed Microsoft access token for user {UserId}", token.UserId);
                }
            }
            else
            {
                _logger.LogError("Failed to refresh Microsoft token: {Response}", responseContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing Microsoft token for user {UserId}", token.UserId);
            throw;
        }
    }
}
