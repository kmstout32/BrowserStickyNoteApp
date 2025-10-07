using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using CalendarSyncAPI.Models;
using CalendarSyncAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace CalendarSyncAPI.Services;

public class GoogleCalendarService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleCalendarService> _logger;

    public GoogleCalendarService(AppDbContext context, IConfiguration configuration, ILogger<GoogleCalendarService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<CalendarService?> GetCalendarServiceAsync(string userId)
    {
        var token = await _context.UserCalendarTokens
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Provider == "Google" && t.IsActive);

        if (token == null) return null;

        // Check if token needs refresh
        if (token.ExpiresAt <= DateTime.UtcNow.AddMinutes(5))
        {
            await RefreshTokenAsync(token);
        }

        var credential = GoogleCredential.FromAccessToken(token.AccessToken);

        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "StickyNote TodoApp"
        });
    }

    public async Task<string?> SyncTodoToGoogleAsync(TodoItem todo, string userId)
    {
        try
        {
            var service = await GetCalendarServiceAsync(userId);
            if (service == null)
            {
                _logger.LogWarning("No Google Calendar service available for user {UserId}", userId);
                return null;
            }

            Event calendarEvent;

            // Check if event already exists
            if (!string.IsNullOrEmpty(todo.GoogleEventId))
            {
                // Update existing event
                calendarEvent = await service.Events.Get("primary", todo.GoogleEventId).ExecuteAsync();
                UpdateEventFromTodo(calendarEvent, todo);
                await service.Events.Update(calendarEvent, "primary", todo.GoogleEventId).ExecuteAsync();
                _logger.LogInformation("Updated Google Calendar event {EventId}", todo.GoogleEventId);
            }
            else
            {
                // Create new event
                calendarEvent = CreateEventFromTodo(todo);
                var createdEvent = await service.Events.Insert(calendarEvent, "primary").ExecuteAsync();
                _logger.LogInformation("Created new Google Calendar event {EventId}", createdEvent.Id);
                return createdEvent.Id;
            }

            return todo.GoogleEventId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing todo {TodoId} to Google Calendar", todo.Id);
            return null;
        }
    }

    public async Task<bool> DeleteFromGoogleAsync(string eventId, string userId)
    {
        try
        {
            var service = await GetCalendarServiceAsync(userId);
            if (service == null) return false;

            await service.Events.Delete("primary", eventId).ExecuteAsync();
            _logger.LogInformation("Deleted Google Calendar event {EventId}", eventId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting event {EventId} from Google Calendar", eventId);
            return false;
        }
    }

    private Event CreateEventFromTodo(TodoItem todo)
    {
        var calendarEvent = new Event
        {
            Summary = todo.Text,
            Description = $"Priority: {todo.Priority ?? "Medium"}",
            Start = new EventDateTime
            {
                DateTime = todo.DueDate ?? DateTime.Now.AddDays(1),
                TimeZone = "UTC"
            },
            End = new EventDateTime
            {
                DateTime = (todo.DueDate ?? DateTime.Now.AddDays(1)).AddHours(1),
                TimeZone = "UTC"
            }
        };

        // Add color based on priority
        if (!string.IsNullOrEmpty(todo.Priority))
        {
            calendarEvent.ColorId = todo.Priority.ToLower() switch
            {
                "high" => "11", // Red
                "medium" => "5", // Yellow
                "low" => "2", // Green
                _ => null
            };
        }

        return calendarEvent;
    }

    private void UpdateEventFromTodo(Event calendarEvent, TodoItem todo)
    {
        calendarEvent.Summary = todo.Text;
        calendarEvent.Description = $"Priority: {todo.Priority ?? "Medium"}{(todo.Completed ? " (Completed)" : "")}";

        if (todo.DueDate.HasValue)
        {
            calendarEvent.Start = new EventDateTime
            {
                DateTime = todo.DueDate.Value,
                TimeZone = "UTC"
            };
            calendarEvent.End = new EventDateTime
            {
                DateTime = todo.DueDate.Value.AddHours(1),
                TimeZone = "UTC"
            };
        }

        // Update color based on priority
        calendarEvent.ColorId = todo.Priority?.ToLower() switch
        {
            "high" => "11",
            "medium" => "5",
            "low" => "2",
            _ => null
        };
    }

    private async Task RefreshTokenAsync(UserCalendarToken token)
    {
        try
        {
            var clientSecrets = new ClientSecrets
            {
                ClientId = _configuration["GoogleCalendar:ClientId"] ?? string.Empty,
                ClientSecret = _configuration["GoogleCalendar:ClientSecret"] ?? string.Empty
            };

            var tokenResponse = new Google.Apis.Auth.OAuth2.Responses.TokenResponse
            {
                RefreshToken = token.RefreshToken
            };

            var credential = new UserCredential(new GoogleAuthorizationCodeFlow(
                new GoogleAuthorizationCodeFlow.Initializer
                {
                    ClientSecrets = clientSecrets
                }), "user", tokenResponse);

            // Force token refresh
            await credential.RefreshTokenAsync(CancellationToken.None);

            // Update token in database
            token.AccessToken = credential.Token.AccessToken;
            token.ExpiresAt = DateTime.UtcNow.AddSeconds(credential.Token.ExpiresInSeconds ?? 3600);
            token.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Refreshed Google access token for user {UserId}", token.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing Google token for user {UserId}", token.UserId);
            throw;
        }
    }
}
