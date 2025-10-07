using Microsoft.AspNetCore.Mvc;
using CalendarSyncAPI.Models;
using CalendarSyncAPI.Services;

namespace CalendarSyncAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CalendarSyncController : ControllerBase
{
    private readonly GoogleCalendarService _googleService;
    private readonly OutlookCalendarService _outlookService;
    private readonly ILogger<CalendarSyncController> _logger;

    public CalendarSyncController(
        GoogleCalendarService googleService,
        OutlookCalendarService outlookService,
        ILogger<CalendarSyncController> logger)
    {
        _googleService = googleService;
        _outlookService = outlookService;
        _logger = logger;
    }

    // POST: api/calendarsync/google
    [HttpPost("google")]
    public async Task<IActionResult> SyncToGoogle([FromBody] SyncRequest request)
    {
        try
        {
            var eventId = await _googleService.SyncTodoToGoogleAsync(request.Todo, request.UserId);
            if (eventId == null)
            {
                return BadRequest(new { error = "Failed to sync to Google Calendar" });
            }

            return Ok(new { success = true, eventId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing to Google Calendar");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    // POST: api/calendarsync/outlook
    [HttpPost("outlook")]
    public async Task<IActionResult> SyncToOutlook([FromBody] SyncRequest request)
    {
        try
        {
            var eventId = await _outlookService.SyncTodoToOutlookAsync(request.Todo, request.UserId);
            if (eventId == null)
            {
                return BadRequest(new { error = "Failed to sync to Outlook Calendar" });
            }

            return Ok(new { success = true, eventId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing to Outlook Calendar");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    // DELETE: api/calendarsync/google/{eventId}
    [HttpDelete("google/{eventId}")]
    public async Task<IActionResult> DeleteFromGoogle(string eventId, [FromQuery] string userId)
    {
        try
        {
            var success = await _googleService.DeleteFromGoogleAsync(eventId, userId);
            if (!success)
            {
                return BadRequest(new { error = "Failed to delete from Google Calendar" });
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting from Google Calendar");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    // DELETE: api/calendarsync/outlook/{eventId}
    [HttpDelete("outlook/{eventId}")]
    public async Task<IActionResult> DeleteFromOutlook(string eventId, [FromQuery] string userId)
    {
        try
        {
            var success = await _outlookService.DeleteFromOutlookAsync(eventId, userId);
            if (!success)
            {
                return BadRequest(new { error = "Failed to delete from Outlook Calendar" });
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting from Outlook Calendar");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

public record SyncRequest(TodoItem Todo, string UserId);
