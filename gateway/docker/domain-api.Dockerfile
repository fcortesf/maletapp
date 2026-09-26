FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY api/src/Trip.API/Trip.API.csproj api/src/Trip.API/
RUN dotnet restore api/src/Trip.API/Trip.API.csproj
COPY api/src/Trip.API/ api/src/Trip.API/
RUN dotnet publish api/src/Trip.API/Trip.API.csproj -c Release --no-restore -o /out
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_URLS=http://+:5110
USER $APP_UID
EXPOSE 5110
ENTRYPOINT ["dotnet", "Trip.API.dll"]
