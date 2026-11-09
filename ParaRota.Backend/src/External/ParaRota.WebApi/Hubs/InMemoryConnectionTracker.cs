using System.Collections.Concurrent;
using ParaRota.Application.Services;

namespace ParaRota.WebApi.Hubs;

/// <summary>
/// Tek-instance prod / dev için yeterli. Scale-out senaryosunda Redis backplane
/// veya başka bir distributed tracker'a geçilir.
/// </summary>
public class InMemoryConnectionTracker : IConnectionTracker
{
    private readonly ConcurrentDictionary<int, HashSet<string>> _connections = new();

    public void TrackConnection(int userId, string connectionId)
    {
        var set = _connections.GetOrAdd(userId, _ => new HashSet<string>());
        lock (set)
        {
            set.Add(connectionId);
        }
    }

    public void UntrackConnection(int userId, string connectionId)
    {
        if (!_connections.TryGetValue(userId, out var set)) return;
        lock (set)
        {
            set.Remove(connectionId);
            if (set.Count == 0)
            {
                _connections.TryRemove(userId, out _);
            }
        }
    }

    public bool IsUserOnline(int userId)
    {
        if (!_connections.TryGetValue(userId, out var set)) return false;
        lock (set)
        {
            return set.Count > 0;
        }
    }
}
