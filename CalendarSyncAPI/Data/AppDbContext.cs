using Microsoft.EntityFrameworkCore;
using CalendarSyncAPI.Models;

namespace CalendarSyncAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<TodoItem> TodoItems { get; set; }
    public DbSet<UserCalendarToken> UserCalendarTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure TodoItem
        modelBuilder.Entity<TodoItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Priority).HasMaxLength(20);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.GoogleEventId);
            entity.HasIndex(e => e.OutlookEventId);
        });

        // Configure UserCalendarToken
        modelBuilder.Entity<UserCalendarToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Provider).IsRequired().HasMaxLength(50);
            entity.Property(e => e.AccessToken).IsRequired();
            entity.Property(e => e.RefreshToken).IsRequired();
            entity.HasIndex(e => new { e.UserId, e.Provider }).IsUnique();
        });
    }
}
