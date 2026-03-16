using Microsoft.EntityFrameworkCore;
using Trip.API.Api.ErrorHandling;
using Trip.API.Api.Items;
using Trip.API.Api.Trips;
using Trip.API.Application.Abstractions;
using Trip.API.Application.Items.CheckItem;
using Trip.API.Application.Items.CreateItemInTrip;
using Trip.API.Application.Items.GetItem;
using Trip.API.Application.Items.ListItemsByTrip;
using Trip.API.Application.Items.PatchItem;
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
// Keep identity resolution behind the abstraction so application handlers stay
// independent from HTTP transport details and any future auth provider choice.
builder.Services.AddScoped<IUserContextAccessor, HttpUserContextAccessor>();
builder.Services.AddScoped<CreateTripHandler>();
builder.Services.AddScoped<GetTripsHandler>();
builder.Services.AddScoped<GetTripByIdHandler>();
builder.Services.AddScoped<ListItemsByTripHandler>();
builder.Services.AddScoped<CreateItemInTripHandler>();
builder.Services.AddScoped<CheckItemHandler>();
builder.Services.AddScoped<GetItemHandler>();
builder.Services.AddScoped<PatchItemHandler>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseHttpsRedirection();

app.MapTripEndpoints();
app.MapItemEndpoints();

app.Run();

public partial class Program;
