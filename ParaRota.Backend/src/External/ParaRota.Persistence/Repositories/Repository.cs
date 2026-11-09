using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using ParaRota.Domain.Abstractions;
using ParaRota.Domain.Repositories;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Repositories;

public class Repository<T>(AppDbContext context) : IRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext Context = context;
    protected readonly DbSet<T> Set = context.Set<T>();

    public Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => Set.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<T?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        => Set.FirstOrDefaultAsync(predicate, cancellationToken);

    public Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default)
        => Set.AnyAsync(predicate, cancellationToken);

    public Task<List<T>> GetAllAsync(CancellationToken cancellationToken = default)
        => Set.AsNoTracking().ToListAsync(cancellationToken);

    public IQueryable<T> Query() => Set.AsQueryable();

    public async Task AddAsync(T entity, CancellationToken cancellationToken = default)
        => await Set.AddAsync(entity, cancellationToken);

    public void Update(T entity) => Set.Update(entity);

    public void Remove(T entity) => Set.Remove(entity);
}
