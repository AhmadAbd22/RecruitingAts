namespace RecruitingAts.Api.Storage;

public class LocalFileStorage : IFileStorage
{
    public const long MaxResumeBytes = 5 * 1024 * 1024;

    private readonly string _root;

    public LocalFileStorage(IWebHostEnvironment env, IConfiguration configuration)
    {
        var configured = configuration["FileStorage:Root"];
        _root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "App_Data", "resumes")
            : configured;

        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(Stream content, string fileName, CancellationToken cancellationToken = default)
    {
        var safeName = Path.GetFileName(fileName);
        var extension = Path.GetExtension(safeName);
        if (!string.Equals(extension, ".pdf", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only PDF files are allowed.");
        }

        if (content.CanSeek && content.Length > MaxResumeBytes)
        {
            throw new InvalidOperationException($"PDF must be {MaxResumeBytes / (1024 * 1024)} MB or smaller.");
        }

        var storedName = $"{Guid.NewGuid():N}.pdf";
        var fullPath = Path.Combine(_root, storedName);

        await using var file = File.Create(fullPath);
        var buffer = new byte[81920];
        long total = 0;
        int read;
        while ((read = await content.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
        {
            total += read;
            if (total > MaxResumeBytes)
            {
                await file.DisposeAsync();
                File.Delete(fullPath);
                throw new InvalidOperationException($"PDF must be {MaxResumeBytes / (1024 * 1024)} MB or smaller.");
            }

            await file.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }

        return storedName;
    }

    public Task<Stream?> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var fullPath = GetFullPath(relativePath);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = File.OpenRead(fullPath);
        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var fullPath = GetFullPath(relativePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    private string GetFullPath(string relativePath)
    {
        var safe = Path.GetFileName(relativePath);
        return Path.Combine(_root, safe);
    }
}
