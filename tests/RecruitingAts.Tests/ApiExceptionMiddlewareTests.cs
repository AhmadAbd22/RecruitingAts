using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RecruitingAts.Api.Middleware;

namespace RecruitingAts.Tests;

public class ApiExceptionMiddlewareTests
{
    [Theory]
    [InlineData("/api/candidates")]
    [InlineData("/api/requisitions")]
    [InlineData("/api/applications")]
    [InlineData("/api/interviews")]
    [InlineData("/api/admin/stages")]
    public async Task UnexpectedErrors_ReturnSafeJsonForEveryModule(string path)
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services, TraceIdentifier = "test-trace" };
        context.Request.Path = path;
        using var body = new MemoryStream();
        context.Response.Body = body;
        var middleware = new ApiExceptionMiddleware(
            _ => Task.FromException(new InvalidOperationException("Private candidate@example.test details")),
            NullLogger<ApiExceptionMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(500, context.Response.StatusCode);
        Assert.Contains("application/json", context.Response.ContentType);
        Assert.Equal("no-store", context.Response.Headers.CacheControl.ToString());
        body.Position = 0;
        using var json = await JsonDocument.ParseAsync(body);
        Assert.Equal("An unexpected error occurred.", json.RootElement.GetProperty("message").GetString());
        Assert.Equal("test-trace", json.RootElement.GetProperty("traceId").GetString());
        Assert.DoesNotContain("candidate@example.test", json.RootElement.GetRawText());
        Assert.DoesNotContain("InvalidOperationException", json.RootElement.GetRawText());
    }

    [Theory]
    [InlineData(200)]
    [InlineData(401)]
    [InlineData(403)]
    [InlineData(404)]
    public async Task NormalResponses_KeepTheirStatus(int status)
    {
        var context = new DefaultHttpContext();
        var middleware = new ApiExceptionMiddleware(http =>
        {
            http.Response.StatusCode = status;
            return Task.CompletedTask;
        }, NullLogger<ApiExceptionMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(status, context.Response.StatusCode);
    }
}
