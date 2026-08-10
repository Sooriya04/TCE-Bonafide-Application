import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';
import SystemStats from '../components/DevConsole/SystemStats';
import LogViewer from '../components/DevConsole/LogViewer';
import DevManagement from '../components/DevConsole/DevManagement';

export default function DevConsole() {
  // system data
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [devs, setDevs] = useState([]);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState(null);

  // log viewer state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;
  const [levelFilter, setLevelFilter] = useState(''); // '' | 'info' | 'warn' | 'error'
  const [timeframe, setTimeframe] = useState(''); // '' | '1h' | '3h' | '1d' | '1w' | '1m'
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showRelative, setShowRelative] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [newLogIds, setNewLogIds] = useState(new Set());
  const [logsLoading, setLogsLoading] = useState(false);

  const logsEndRef = useRef(null);
  const sseRef = useRef(null);
  const searchTimer = useRef(null);

  // dev form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Data fetching
  const fetchSysData = useCallback(async () => {
    try {
      const [h, m, d] = await Promise.all([
        api.get('/dev/health'),
        api.get('/dev/metrics'),
        api.get('/dev/users'),
      ]);
      setHealth(h.data);
      setMetrics(m.data);
      setDevs(d.data);
    } catch (err) {
      setError('Failed to load system metrics.');
    } finally {
      setInitLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (lvl = levelFilter, tf = timeframe, srch = search, off = 0, append = false) => {
    setLogsLoading(true);
    try {
      const params = { limit: LIMIT, offset: off };
      if (lvl) params.level = lvl;
      if (tf) params.timeframe = tf;
      if (srch) params.search = srch;
      const res = await api.get('/dev/logs', { params });
      const incoming = res.data.logs || [];
      setTotal(res.data.total || 0);
      if (append) {
        setLogs(prev => [...prev, ...incoming]);
      } else {
        setLogs(incoming);
      }
      setOffset(off);
    } catch (err) {
      setError('Failed to load logs.');
    } finally {
      setLogsLoading(false);
    }
  }, [levelFilter, timeframe, search]);

  // SSE live streaming
  const startSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const params = new URLSearchParams();
    if (levelFilter) params.set('level', levelFilter);
    if (search) params.set('search', search);
    // Note: live stream operates on incoming real-time events, timeframe is not applicable here
    const url = `/api/dev/logs/stream?${params.toString()}`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const log = JSON.parse(e.data);
        setLogs(prev => [log, ...prev]);
        setTotal(t => t + 1);
        setNewLogIds(ids => new Set([...ids, log.id]));
        setTimeout(() => setNewLogIds(ids => { const n = new Set(ids); n.delete(log.id); return n; }), 2000);
      } catch (_) {}
    };

    sseRef.current = es;
  }, [levelFilter, search]);

  const stopSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  // Download logs as .txt
  const downloadLogs = async () => {
    try {
      const params = { limit: 2000, offset: 0 };
      if (levelFilter) params.level = levelFilter;
      if (timeframe) params.timeframe = timeframe;
      if (search) params.search = search;
      const res = await api.get('/dev/logs', { params });
      const lines = (res.data.logs || []).map(l =>
        `[${new Date(l.created_at).toISOString()}] [${l.level?.toUpperCase()}] ${l.message}`
      ).join('\n');
      const blob = new Blob([lines], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tce-logs-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  // Effects
  useEffect(() => {
    fetchSysData();
    fetchLogs('', '', '', 0);
    const sysInterval = setInterval(fetchSysData, 30000);
    return () => {
      clearInterval(sysInterval);
      stopSSE();
    };
  }, []);

  // Toggle live mode
  useEffect(() => {
    if (liveMode) startSSE();
    else stopSSE();
  }, [liveMode]);

  // Re-fetch logs when filter, timeframe, or search changes
  useEffect(() => {
    if (!liveMode) fetchLogs(levelFilter, timeframe, search, 0);
    else startSSE();
  }, [levelFilter, timeframe, search]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Debounced search
  const handleSearchInput = (v) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 400);
  };

  // Dev account handlers
  const handleAddDev = async (e) => {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    try {
      await api.post('/dev/users', { email: newEmail, name: newName });
      setNewEmail('');
      setNewName('');
      const d = await api.get('/dev/users');
      setDevs(d.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add developer.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRevokeDev = async (id) => {
    if (!window.confirm('Revoke developer access for this account?')) return;
    try {
      await api.delete(`/dev/users/${id}`);
      const d = await api.get('/dev/users');
      setDevs(d.data);
    } catch (_) {
      setError('Failed to revoke access.');
    }
  };

  if (initLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Loading developer console...
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Developer Console</h1>
          <p>Real-time system diagnostics, live log streaming, and developer management</p>
        </div>
        <a href="/admin" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
          Back to Requests
        </a>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* System Health Stats & Memory */}
      <SystemStats health={health} metrics={metrics} />

      {/* Logs Viewer */}
      <LogViewer
        logs={logs}
        total={total}
        offset={offset}
        LIMIT={LIMIT}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
        searchInput={searchInput}
        handleSearchInput={handleSearchInput}
        showRelative={showRelative}
        setShowRelative={setShowRelative}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        liveMode={liveMode}
        setLiveMode={setLiveMode}
        newLogIds={newLogIds}
        logsLoading={logsLoading}
        logsEndRef={logsEndRef}
        downloadLogs={downloadLogs}
        fetchLogs={fetchLogs}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
      />

      {/* Developer Management */}
      <DevManagement
        devs={devs}
        newName={newName}
        setNewName={setNewName}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        formSubmitting={formSubmitting}
        handleAddDev={handleAddDev}
        handleRevokeDev={handleRevokeDev}
      />

      {/* pulse animation keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
