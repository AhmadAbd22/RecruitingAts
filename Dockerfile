# Multi-stage: Node builds the SPA into wwwroot, then ASP.NET publishes the API.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . .
WORKDIR /src/backend
RUN dotnet restore
RUN dotnet publish RecruitingAts.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p /app/App_Data/resumes

ENV ASPNETCORE_ENVIRONMENT=Production
ENV Database__Provider=Sqlite
# Quote required: unquoted ENV stops at the first space and becomes just "Data".
ENV ConnectionStrings__DefaultConnection="Data Source=/app/App_Data/recruitingats.db"
ENV FileStorage__Root=/app/App_Data/resumes
ENV ASPNETCORE_URLS=http://0.0.0.0:8080

EXPOSE 8080
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet RecruitingAts.Api.dll"]
