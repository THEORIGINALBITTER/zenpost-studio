using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ZenPost.Server.Auth;
using ZenPost.Server.Contracts;
using ZenPost.Server.Data;
using ZenPost.Server.Models;
using ZenPost.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<ThumbnailService>();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("Default");
    var versionStr = builder.Configuration["MySql:ServerVersion"] ?? "8.0.36-mysql";
    options.UseMySql(cs, ServerVersion.Parse(versionStr));
});

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key))
        };
    })
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Auth:Google:ClientId"] ?? "";
        options.ClientSecret = builder.Configuration["Auth:Google:ClientSecret"] ?? "";
    })
    .AddMicrosoftAccount(options =>
    {
        options.ClientId = builder.Configuration["Auth:Microsoft:ClientId"] ?? "";
        options.ClientSecret = builder.Configuration["Auth:Microsoft:ClientSecret"] ?? "";
    });

// Apple SSO needs a separate package and setup.
// We'll add it once package source is available.

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/auth/register", async (RegisterRequest req, AppDbContext db, JwtService jwt) =>
{
    var email = req.Email.Trim().ToLowerInvariant();
    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest("Email und Passwort sind erforderlich.");

    var exists = await db.Users.AnyAsync(u => u.Email == email);
    if (exists) return Results.Conflict("User existiert bereits.");

    var user = new User
    {
        Id = Guid.NewGuid(),
        Email = email,
        DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? email : req.DisplayName.Trim(),
        PasswordHash = PasswordHasher.Hash(req.Password)
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    var token = jwt.CreateToken(user);
    return Results.Ok(new AuthResponse(token, user.Email, user.DisplayName));
});

app.MapPost("/auth/login", async (LoginRequest req, AppDbContext db, JwtService jwt) =>
{
    var email = req.Email.Trim().ToLowerInvariant();
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash))
        return Results.Unauthorized();

    var token = jwt.CreateToken(user);
    return Results.Ok(new AuthResponse(token, user.Email, user.DisplayName));
});

app.MapGet("/auth/me", (ClaimsPrincipal user) =>
{
    var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
    var name = user.FindFirstValue(ClaimTypes.Name) ?? "";
    return Results.Ok(new { email, displayName = name });
}).RequireAuthorization();

app.MapGet("/projects", async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = RequireUserId(user);
    var projects = await db.Projects
        .Where(p => p.UserId == userId)
        .OrderByDescending(p => p.UpdatedAt)
        .Select(p => new ProjectResponse(p.Id, p.Name, p.CreatedAt, p.UpdatedAt))
        .ToListAsync();
    return Results.Ok(projects);
}).RequireAuthorization();

app.MapPost("/projects", async (ProjectCreateRequest req, ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = RequireUserId(user);
    var name = string.IsNullOrWhiteSpace(req.Name) ? "Mein Projekt" : req.Name.Trim();
    var project = new Project
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Name = name,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    db.Projects.Add(project);
    await db.SaveChangesAsync();

    return Results.Ok(new ProjectResponse(project.Id, project.Name, project.CreatedAt, project.UpdatedAt));
}).RequireAuthorization();

app.MapDelete("/projects/{id:guid}", async (Guid id, ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = RequireUserId(user);
    var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
    if (project is null) return Results.NotFound();

    db.Projects.Remove(project);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/projects/{id:guid}/documents", async (Guid id, ClaimsPrincipal user, AppDbContext db, HttpContext http) =>
{
    var userId = RequireUserId(user);
    var baseUrl = $"{http.Request.Scheme}://{http.Request.Host}";
    var docs = await db.Documents
        .Where(d => d.ProjectId == id && d.UserId == userId)
        .OrderByDescending(d => d.CreatedAt)
        .Select(d => new DocumentResponse(
            d.Id,
            d.ProjectId,
            d.FileName,
            d.MimeType,
            d.SizeBytes,
            d.CreatedAt,
            $"{baseUrl}/documents/{d.Id}",
            db.DocumentThumbnails.Any(t => t.DocumentId == d.Id) ? $"{baseUrl}/documents/{d.Id}/thumbnail" : null
        ))
        .ToListAsync();

    return Results.Ok(docs);
}).RequireAuthorization();

app.MapPost("/projects/{id:guid}/documents", async (Guid id, ClaimsPrincipal user, HttpRequest request, AppDbContext db, ThumbnailService thumbs, IConfiguration config, HttpContext http) =>
{
    var userId = RequireUserId(user);
    var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
    if (project is null) return Results.NotFound("Projekt nicht gefunden");

    if (!request.HasFormContentType) return Results.BadRequest("multipart/form-data erwartet");
    var form = await request.ReadFormAsync();
    var file = form.Files[0];
    if (file is null) return Results.BadRequest("Keine Datei gefunden");

    var maxMb = config.GetValue<int>("Upload:MaxFileSizeMb");
    var maxBytes = maxMb * 1024L * 1024L;
    if (file.Length > maxBytes) return Results.BadRequest($"Datei zu gross (max {maxMb}MB)");

    var allowed = config.GetSection("Upload:AllowedMimeTypes").Get<string[]>() ?? Array.Empty<string>();
    if (!allowed.Contains(file.ContentType)) return Results.BadRequest("Dateityp nicht erlaubt");

    await using var ms = new MemoryStream();
    await file.CopyToAsync(ms);

    var doc = new Document
    {
        Id = Guid.NewGuid(),
        ProjectId = project.Id,
        UserId = userId,
        FileName = file.FileName,
        MimeType = file.ContentType,
        SizeBytes = file.Length,
        Data = ms.ToArray(),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    if (file.ContentType.StartsWith("image/"))
    {
        ms.Position = 0;
        var (data, mime) = await thumbs.CreateThumbnailAsync(ms);
        doc.Thumbnail = new DocumentThumbnail
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            MimeType = mime,
            SizeBytes = data.Length,
            Data = data
        };
    }

    db.Documents.Add(doc);
    project.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    var response = new DocumentResponse(
        doc.Id,
        doc.ProjectId,
        doc.FileName,
        doc.MimeType,
        doc.SizeBytes,
        doc.CreatedAt,
        $"{http.Request.Scheme}://{http.Request.Host}/documents/{doc.Id}",
        doc.Thumbnail != null ? $"{http.Request.Scheme}://{http.Request.Host}/documents/{doc.Id}/thumbnail" : null
    );

    return Results.Ok(response);
}).RequireAuthorization();

app.MapGet("/documents/{id:guid}", async (Guid id, ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = RequireUserId(user);
    var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
    if (doc is null) return Results.NotFound();
    return Results.File(doc.Data, doc.MimeType, doc.FileName);
}).RequireAuthorization();

app.MapGet("/documents/{id:guid}/thumbnail", async (Guid id, ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = RequireUserId(user);
    var thumb = await db.DocumentThumbnails.FirstOrDefaultAsync(t => t.DocumentId == id);
    var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
    if (doc is null || thumb is null) return Results.NotFound();
    return Results.File(thumb.Data, thumb.MimeType);
}).RequireAuthorization();

app.MapDelete("/documents/{id:guid}", async (Guid id, ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = RequireUserId(user);
    var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
    if (doc is null) return Results.NotFound();
    db.Documents.Remove(doc);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.Run();

static Guid RequireUserId(ClaimsPrincipal user)
{
    var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(idStr)) throw new InvalidOperationException("Unauthorized");
    return Guid.Parse(idStr);
}
