namespace ZenPost.Server.Models;

public class DocumentThumbnail
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string MimeType { get; set; } = "image/jpeg";
    public long SizeBytes { get; set; }
    public byte[] Data { get; set; } = Array.Empty<byte>();

    public Document? Document { get; set; }
}
