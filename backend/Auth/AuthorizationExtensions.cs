namespace RecruitingAts.Api.Auth;

public static class AuthorizationExtensions
{
    public static IServiceCollection AddAppAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            foreach (var permission in Permissions.All)
            {
                options.AddPolicy(permission, policy =>
                    policy.RequireClaim(Permissions.ClaimType, permission));
            }
        });

        return services;
    }
}
