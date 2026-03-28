# ── Stage 1: build ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore first (better layer caching)
COPY PropertyApi/PropertyApi.csproj PropertyApi/
RUN dotnet restore PropertyApi/PropertyApi.csproj

# Copy everything else and publish
COPY PropertyApi/ PropertyApi/
RUN dotnet publish PropertyApi/PropertyApi.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Stage 2: runtime ───────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "PropertyApi.dll"]
