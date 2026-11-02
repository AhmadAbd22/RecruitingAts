using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using RecruitingAts.Api.Storage;

namespace RecruitingAts.Tests;

/// <summary>
/// Covers LocalFileStorage.SaveAsync PDF checks (talent-pool resume uploads).
/// </summary>
public class LocalFileStorageTests : IDisposable
{
    private readonly string _root;
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "RecruitingAtsTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["FileStorage:Root"] = _root
            })
            .Build();

        _storage = new LocalFileStorage(new FakeWebHostEnvironment(), config);
    }

    [Fact]
    public async Task SaveAsync_ValidPdf_StoresUnderRoot()
    {
        await using var pdf = new MemoryStream(Encoding.ASCII.GetBytes("%PDF-1.4\ncontent\n%%EOF\n"));

        var path = await _storage.SaveAsync(pdf, "resume.pdf");

        Assert.EndsWith(".pdf", path);
        Assert.True(File.Exists(Path.Combine(_root, path)));
    }

    [Fact]
    public async Task SaveAsync_NonPdfExtension_Throws()
    {
        await using var pdf = new MemoryStream(Encoding.ASCII.GetBytes("%PDF-1.4\n"));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _storage.SaveAsync(pdf, "resume.txt"));

        Assert.Equal("Only PDF files are allowed.", ex.Message);
    }

    [Fact]
    public async Task SaveAsync_MissingPdfHeader_Throws()
    {
        await using var junk = new MemoryStream(Encoding.ASCII.GetBytes("not-a-pdf"));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _storage.SaveAsync(junk, "resume.pdf"));

        Assert.Equal("The file does not have a PDF header.", ex.Message);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
