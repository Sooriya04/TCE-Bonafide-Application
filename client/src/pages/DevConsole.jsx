import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function DevConsole() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [devs, setDevs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states to add developer
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchDevData = async () => {
    try {
      const [healthRes, metricsRes, logsRes, devsRes] = await Promise.all([
        api.get('/dev/health'),
        api.get('/dev/metrics'),
        api.get('/dev/logs'),
        api.get('/dev/users')
      ]);

      setHealth(healthRes.data);
      setMetrics(metricsRes.data);
      setLogs(logsRes.data.logs);
      setDevs(devsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to retrieve system status metrics.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevData();
    const interval = setInterval(fetchDevData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAddDev = async (e) => {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    setError(null);
    try {
      await api.post('/dev/users', { email: newEmail, name: newName });
      setNewEmail('');
      setNewName('');
      // Reload dev list
      const devsRes = await api.get('/dev/users');
      setDevs(devsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add developer.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRevokeDev = async (id) => {
    if (!window.confirm('Are you sure you want to revoke developer permissions for this account?')) return;
    setError(null);
    try {
      await api.delete(`/dev/users/${id}`);
      // Reload dev list
      const devsRes = await api.get('/dev/users');
      setDevs(devsRes.data);
    } catch (err) {
      setError('Failed to revoke developer access.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Checking server health & loading logs…
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>⚙ Developer Console</h1>
          <p>Real-time system diagnostics, health telemetry, log tracing, and developer accounts</p>
        </div>
        <a href="/admin" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Requests
        </a>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Health Checks Status */}
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
          <div className="stat-label">Primary Database</div>
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
          <div className="stat-label">Server Uptime</div>
        </div>
      </div>

      {/* Grid: Memory Metrics + System Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        {/* Memory Usage Card */}
        <div className="form-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>System Memory Usage</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resident Set Size (RSS):</span>
              <strong style={{ color: 'var(--text)' }}>{metrics?.memory?.rss || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Heap Memory Used:</span>
              <strong style={{ color: 'var(--text)' }}>{metrics?.memory?.heapUsed || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Heap Memory Total:</span>
              <strong style={{ color: 'var(--text)' }}>{metrics?.memory?.heapTotal || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Redis Memory footprint:</span>
              <strong style={{ color: 'var(--text)' }}>
                {metrics?.redis_memory_info?.[0] ? metrics.redis_memory_info[0].split(':')[1] : '—'}
              </strong>
            </div>
          </div>
        </div>

        {/* Real-time System Logs */}
        <div className="form-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent)', margin: 0 }}>System Logs (Last 30 entries)</h2>
            <button className="btn-secondary" onClick={fetchDevData} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              Refresh Logs
            </button>
          </div>

          <div style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            borderRadius: '2px',
            overflowY: 'auto',
            maxHeight: '160px',
            whiteSpace: 'pre-wrap',
            flex: 1
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No logs recorded in PostgreSQL log database.</div>
            ) : (
              logs.map(log => {
                let color = '#d4d4d4';
                if (log.level === 'error' || log.level?.includes('error')) color = '#f44336';
                if (log.level === 'warn' || log.level?.includes('warn')) color = '#ffeb3b';
                if (log.level === 'info' || log.level?.includes('info')) color = '#4caf50';

                // Safe parsing of log.meta
                let parsedMeta = null;
                if (log.meta) {
                  if (typeof log.meta === 'object') {
                    parsedMeta = log.meta;
                  } else {
                    try {
                      parsedMeta = JSON.parse(log.meta);
                    } catch (e) {
                      parsedMeta = { raw: String(log.meta) };
                    }
                  }
                }

                return (
                  <div key={log.id} style={{ marginBottom: '6px', lineHeight: '1.4' }}>
                    <span style={{ color: '#888' }}>[{new Date(log.created_at).toLocaleTimeString()}]</span>{' '}
                    <span style={{ color, fontWeight: 'bold' }}>{log.level?.toUpperCase()}</span>:{' '}
                    <span>{log.message}</span>
                    {parsedMeta && Object.keys(parsedMeta).length > 0 && (
                      <span style={{ color: '#6a9955', marginLeft: '6px' }}>
                        {JSON.stringify(parsedMeta)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section: Developer Accounts Management */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '24px' }}>
        {/* Add Developer Form */}
        <div className="form-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>Grant Dev Role</h2>
          <form onSubmit={handleAddDev}>
            <div className="field-item" style={{ marginBottom: '12px' }}>
              <label className="field-label">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. S. Sooriya"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="field-item" style={{ marginBottom: '16px' }}>
              <label className="field-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@student.tce.edu"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={formSubmitting}>
              {formSubmitting ? 'Adding…' : 'Add Developer'}
            </button>
          </form>
        </div>

        {/* Developers List Table */}
        <div className="form-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>Registered Developers</h2>
          <div className="data-table-wrap" style={{ maxHeight: '250px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Granted On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No developer accounts registered.
                    </td>
                  </tr>
                ) : (
                  devs.map(dev => (
                    <tr key={dev.id}>
                      <td style={{ fontWeight: '600' }}>{dev.name}</td>
                      <td>{dev.email}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(dev.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleRevokeDev(dev.id)}
                          className="badge"
                          style={{
                            background: 'var(--error-bg)',
                            color: 'var(--error)',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'Montserrat, sans-serif'
                          }}
                        >
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
