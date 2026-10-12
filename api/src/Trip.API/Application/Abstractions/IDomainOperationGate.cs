namespace Trip.API.Application.Abstractions;

public interface IDomainOperationGate
{
    Task<IDisposable> AcquireAsync(CancellationToken cancellationToken);
}
