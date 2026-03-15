using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Trip.API.Infrastructure.Persistence.Configurations;

public sealed class TripConfiguration : IEntityTypeConfiguration<TripDataModel>
{
    public void Configure(EntityTypeBuilder<TripDataModel> builder)
    {
        builder.HasKey(trip => trip.Id);

        builder.Property(trip => trip.Destination)
            .IsRequired();

        builder.HasMany(trip => trip.Baggages)
            .WithOne(baggage => baggage.Trip)
            .HasForeignKey(baggage => baggage.TripId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
