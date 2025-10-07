# Calendar Sync API - C# Backend

This is an ASP.NET Core Web API that provides calendar integration for the Sticky Note Todo App. It supports syncing tasks to Google Calendar and Microsoft Outlook Calendar using OAuth 2.0 authentication.

## Prerequisites

- **.NET 8 SDK** - [Download here](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Google Cloud Project** (for Google Calendar integration)
- **Microsoft Azure App** (for Outlook Calendar integration)

## Setup Instructions

### 1. Install .NET 8 SDK

Download and install the .NET 8 SDK from Microsoft:
```bash
# Verify installation
dotnet --version
```

### 2. Restore NuGet Packages

```bash
cd CalendarSyncAPI
dotnet restore
```

### 3. Configure Google Calendar API

#### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   ```
   http://localhost:5000/api/auth/google/callback
   http://localhost:5001/api/auth/google/callback
   ```
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

#### Update appsettings.json

```json
"GoogleCalendar": {
  "ClientId": "YOUR_GOOGLE_CLIENT_ID_HERE",
  "ClientSecret": "YOUR_GOOGLE_CLIENT_SECRET_HERE",
  "RedirectUri": "http://localhost:5000/api/auth/google/callback"
}
```

### 4. Configure Microsoft Graph API (Outlook Calendar)

#### Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Enter name: "StickyNote TodoApp"
5. Select "Accounts in any organizational directory and personal Microsoft accounts"
6. Add redirect URI:
   - Platform: Web
   - URI: `http://localhost:5000/api/auth/microsoft/callback`
7. Click "Register"

#### Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `Calendars.ReadWrite`
   - `offline_access`
6. Click "Add permissions"
7. Click "Grant admin consent"

#### Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Enter description and select expiration
4. Click "Add"
5. **Copy the secret value immediately** (you won't see it again)

#### Update appsettings.json

```json
"MicrosoftGraph": {
  "ClientId": "YOUR_MICROSOFT_CLIENT_ID_HERE",
  "ClientSecret": "YOUR_MICROSOFT_CLIENT_SECRET_HERE",
  "TenantId": "common",
  "RedirectUri": "http://localhost:5000/api/auth/microsoft/callback",
  "Scopes": "Calendars.ReadWrite offline_access"
}
```

### 5. Database Setup

The API uses SQLite for storing OAuth tokens. The database will be created automatically on first run.

Location: `calendar_sync.db` in the project directory

### 6. Run the API

```bash
# Development mode (with hot reload)
dotnet watch run

# Production mode
dotnet run
```

The API will start on:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`

### 7. Test the API

Visit Swagger UI to test endpoints:
```
http://localhost:5000/swagger
```

## API Endpoints

### Authentication

#### Get Google OAuth URL
```
GET /api/auth/google/url?userId={userId}
```

#### Get Microsoft OAuth URL
```
GET /api/auth/microsoft/url?userId={userId}
```

#### Check Auth Status
```
GET /api/auth/status?userId={userId}
```

#### Disconnect Calendar
```
POST /api/auth/disconnect
Body: { "userId": "user123", "provider": "Google" }
```

### Calendar Sync

#### Sync Task to Google Calendar
```
POST /api/calendarsync/google
Body: {
  "todo": {
    "id": 1,
    "text": "Task name",
    "priority": "high",
    "dueDate": "2024-10-15T14:00:00Z",
    ...
  },
  "userId": "user123"
}
```

#### Sync Task to Outlook Calendar
```
POST /api/calendarsync/outlook
Body: { "todo": {...}, "userId": "user123" }
```

#### Delete from Google Calendar
```
DELETE /api/calendarsync/google/{eventId}?userId={userId}
```

#### Delete from Outlook Calendar
```
DELETE /api/calendarsync/outlook/{eventId}?userId={userId}
```

## Security Considerations

1. **Never commit `appsettings.json` with real credentials**
2. Use environment variables for production:
   ```bash
   dotnet user-secrets set "GoogleCalendar:ClientId" "your-client-id"
   dotnet user-secrets set "GoogleCalendar:ClientSecret" "your-client-secret"
   ```
3. Tokens are stored encrypted in SQLite database
4. HTTPS should be used in production
5. Implement proper user authentication before production use

## Development Tips

### Watch for Changes
```bash
dotnet watch run
```

### View Logs
Logs are written to console. Set log level in `appsettings.json`:
```json
"Logging": {
  "LogLevel": {
    "Default": "Information",
    "Microsoft.AspNetCore": "Warning",
    "CalendarSyncAPI": "Debug"
  }
}
```

### Database Migrations
```bash
# Install EF Core tools
dotnet tool install --global dotnet-ef

# Create migration
dotnet ef migrations add InitialCreate

# Update database
dotnet ef database update
```

## Troubleshooting

### "Could not find a part of the path" error
- Make sure you're in the CalendarSyncAPI directory
- Run `dotnet restore` first

### OAuth redirect URI mismatch
- Ensure redirect URIs in Google/Azure match exactly with appsettings.json
- Check for http vs https
- Check port numbers (5000 vs 5001)

### Token refresh failures
- Verify client secrets are still valid
- Check that `offline_access` scope is granted
- Ensure refresh tokens are being saved properly

### CORS errors from frontend
- Add your frontend URL to `appsettings.json` under `Cors:AllowedOrigins`
- Restart the API after making changes

## Next Steps

1. ✅ Backend API created
2. ⏭️ Update frontend to call C# API
3. ⏭️ Add user authentication
4. ⏭️ Implement webhook listeners for two-way sync
5. ⏭️ Add background sync service
6. ⏭️ Deploy to production (Azure, AWS, etc.)

## Resources

- [Google Calendar API Docs](https://developers.google.com/calendar/api/guides/overview)
- [Microsoft Graph Calendar Docs](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [ASP.NET Core Docs](https://learn.microsoft.com/en-us/aspnet/core)
- [Entity Framework Core Docs](https://learn.microsoft.com/en-us/ef/core/)
