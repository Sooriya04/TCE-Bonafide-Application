import React from 'react';

export default function SystemStats({ health, metrics }) {
  return (
    <div>
      {/* Health Stats */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.checks?.student_service ? 'var(--success)' : 'var(--error)', fontSize: '1.1rem' }}>
            {health?.checks?.student_service ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="stat-label">Student Service</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.checks?.admin_service ? 'var(--success)' : 'var(--error)', fontSize: '1.1rem' }}>
            {health?.checks?.admin_service ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="stat-label">Admin Service</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.checks?.postgres_primary ? 'var(--success)' : 'var(--error)', fontSize: '1.1rem' }}>
            {health?.checks?.postgres_primary ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="stat-label">PostgreSQL DB</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.checks?.redis ? 'var(--success)' : 'var(--error)', fontSize: '1.1rem' }}>
            {health?.checks?.redis ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="stat-label">Redis Cache</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text)', fontSize: '1.1rem' }}>
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
