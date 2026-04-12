namespace ZenPost.Server.Models;

public class AuthProvider
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Provider { get; set; } = string.Empty; // google|apple|microsoft
    public string ProviderUserId { get; set; } = string.Empty;

    public User? User { get; set; }
}
