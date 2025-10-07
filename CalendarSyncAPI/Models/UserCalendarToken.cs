namespace CalendarSyncAPI.Models;

public class UserCalendarToken
{
    public int Id { get; set; }
    public required string UserId { get; set; }
    public required string Provider { get; set; } // "Google" or "Microsoft"
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UserEmail { get; set; }
    public bool IsActive { get; set; } = true;
}
