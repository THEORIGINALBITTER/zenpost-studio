using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace ZenPost.Server.Services;

public class ThumbnailService
{
    public async Task<(byte[] data, string mimeType)> CreateThumbnailAsync(Stream imageStream, int size = 512)
    {
        using var image = await Image.LoadAsync(imageStream);
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(size, size),
            Mode = ResizeMode.Max
        }));

        using var output = new MemoryStream();
        var encoder = new JpegEncoder { Quality = 80 };
        await image.SaveAsJpegAsync(output, encoder);
        return (output.ToArray(), "image/jpeg");
    }
}
