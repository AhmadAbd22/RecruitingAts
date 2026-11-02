namespace RecruitingAts.Api.Middleware;

public class ApiExceptionMiddleware(
    RequestDelegate next,
    ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception error)
        {
            if (context.RequestAborted.IsCancellationRequested)
            {
                context.Abort();
                return;
            }

            // Keep personal data and internal exception messages out of the response and log.
            logger.LogError(
                "API request failed. Type: {ErrorType}. Trace ID: {TraceId}",
                error.GetType().Name,
                context.TraceIdentifier);

            if (context.Response.HasStarted)
            {
                context.Abort();
                return;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.Headers["Cache-Control"] = "no-store";
            await context.Response.WriteAsJsonAsync(new
            {
                message = "An unexpected error occurred.",
                traceId = context.TraceIdentifier
            });
        }
    }
}
