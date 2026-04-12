namespace ZenPost.Server.Contracts;

public record RegisterRequest(string Email, string Password, string DisplayName);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, string DisplayName);

public record ProjectCreateRequest(string Name);
public record ProjectResponse(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);

public record DocumentResponse(
    Guid Id,
    Guid ProjectId,
    string FileName,
    string MimeType,
    long SizeBytes,
    DateTime CreatedAt,
    string DownloadUrl,
    string? ThumbnailUrl
);
