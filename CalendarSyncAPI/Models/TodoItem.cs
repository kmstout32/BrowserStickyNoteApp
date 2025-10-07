namespace CalendarSyncAPI.Models;

public class TodoItem
{
    public int Id { get; set; }
    public required string Text { get; set; }
    public bool Completed { get; set; }
    public string? Priority { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public int Order { get; set; }
    public string? UserId { get; set; }

    // Calendar sync properties
    public string? GoogleEventId { get; set; }
    public string? OutlookEventId { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public bool SyncToGoogle { get; set; }
    public bool SyncToOutlook { get; set; }
}
