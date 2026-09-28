using Trip.API.Infrastructure.Concurrency;

namespace Trip.API.UnitTests.Infrastructure;

public sealed class DomainOperationGateTests
{
    [Fact]
    public async Task QueuedCancellation_DoesNotReleaseAnotherLease_AndDisposeIsIdempotentAsync()
    {
        using var gate = new DomainOperationGate();
        var held = await gate.AcquireAsync(CancellationToken.None);
        using var cancellation = new CancellationTokenSource();
        var queued = gate.AcquireAsync(cancellation.Token);
        Assert.False(queued.IsCompleted);
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => queued);
        var following = gate.AcquireAsync(CancellationToken.None);
        Assert.False(following.IsCompleted);
        held.Dispose();
        held.Dispose();
        using var next = await following.WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task ExceptionAndCancellationAfterAcquisition_ReleaseInFinallyAsync()
    {
        using var gate = new DomainOperationGate();
        using var cancellation = new CancellationTokenSource();
        await Assert.ThrowsAsync<OperationCanceledException>(async () =>
        {
            using var lease = await gate.AcquireAsync(cancellation.Token);
            cancellation.Cancel();
            cancellation.Token.ThrowIfCancellationRequested();
        });
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            using var lease = await gate.AcquireAsync(CancellationToken.None);
            throw new InvalidOperationException("Controlled failure");
        });
        using var next = await gate.AcquireAsync(CancellationToken.None).WaitAsync(TimeSpan.FromSeconds(5));
    }
}
