# ZenPost Server (.NET 8)

Minimal API backend for ZenPost with SQL Server storage and thumbnail generation.

## Local Run
1. Set connection string in `server/ZenPost.Server/appsettings.json`.
2. Set JWT key + OAuth provider credentials.
3. Run:

```bash
cd server/ZenPost.Server
# restore + run
# dotnet restore
# dotnet run
```

## Notes
- Files are stored in SQL Server (`VARBINARY(MAX)`).
- Images get a JPEG thumbnail (max 512px).
- Web + Desktop use the same API base URL (e.g. `https://api.zenpost.denisbitter.de`).

## TODO (next steps)
- Add OAuth code exchange endpoints for Google/Apple/Microsoft.
- Add migrations and CI pipeline.
- Add rate limiting + virus scanning (optional).
