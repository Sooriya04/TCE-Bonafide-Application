import React from 'react';

export default function SystemStats({ health, metrics }) {
  return (
    <div>
      {/* Health Stats */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.status === 'healthy' ? 'var(--success)' : 'var(--error)' }}>
            {health?.status?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div className="stat-label">System Health</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.checks?.postgres_primary ? 'var(--success)' : 'var(--error)' }}>
            {health?.checks?.postgres_primary ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="stat-label">Primary DB</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.checks?.redis ? 'var(--success)' : 'var(--error)' }}>
            {health?.checks?.redis ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="stat-label">Redis Cache</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text)' }}>
            {metrics?.uptime_seconds ? `${Math.floor(metrics.uptime_seconds / 60)}m` : '—'}
          </div>
          <div className="stat-label">Uptime</div>
        </div>
      </div>

      {/* Memory */}
      <div className="form-panel" style={{ padding: '20px 24px', marginBottom: '20px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, alignSelf: 'center' }}>MEMORY</span>
        {[
          ['RSS', metrics?.memory?.rss],
          ['Heap Used', metrics?.memory?.heapUsed],
          ['Heap Total', metrics?.memory?.heapTotal],
          ['Redis', metrics?.redis_memory_info?.[0]?.split(':')?.[1]?.trim()],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
            <strong style={{ color: 'var(--text)' }}>{val || '—'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
