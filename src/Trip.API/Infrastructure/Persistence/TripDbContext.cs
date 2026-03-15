using Microsoft.EntityFrameworkCore;

namespace Trip.API.Infrastructure.Persistence;

public sealed class TripDbContext : DbContext
{
    public TripDbContext(DbContextOptions<TripDbContext> options)
        : base(options)
    {
    }

    public DbSet<TripDataModel> Trips => Set<TripDataModel>();
    public DbSet<BaggageDataModel> Baggages => Set<BaggageDataModel>();
    public DbSet<ItemDataModel> Items => Set<ItemDataModel>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TripDbContext).Assembly);
    }
}
