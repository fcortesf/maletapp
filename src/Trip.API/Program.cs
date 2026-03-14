using Microsoft.EntityFrameworkCore;
using Trip.API.Api.ErrorHandling;
using Trip.API.Api.Trips;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Trips.CreateTrip;
using Trip.API.Application.Trips.GetTripById;
using Trip.API.Application.Trips.GetTrips;
using Trip.API.Infrastructure.Persistence;
using Trip.API.Infrastructure.Repositories;
using Trip.API.Infrastructure.UserContext;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<TripDbContext>(options =>
    options.UseInMemoryDatabase("maletapp-trips"));

builder.Services.AddScoped<ITripRepository, TripRepository>();
builder.Services.AddScoped<IUserContextAccessor, HttpUserContextAccessor>();
builder.Services.AddScoped<CreateTripHandler>();
builder.Services.AddScoped<GetTripsHandler>();
builder.Services.AddScoped<GetTripByIdHandler>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseHttpsRedirection();

app.MapTripEndpoints();

app.Run();

public partial class Program;
