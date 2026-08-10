import React from 'react';

// Helpers
function levelColor(level = '') {
  if (level.includes('error')) return '#f87171';
  if (level.includes('warn'))  return '#fbbf24';
  if (level.includes('info'))  return '#34d399';
  return '#9ca3af';
}

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function absTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour12: false });
}

function LogLine({ log, showRelative, isNew }) {
  let meta = null;
  if (log.meta) {
    try { meta = typeof log.meta === 'object' ? log.meta : JSON.parse(log.meta); }
    catch (_) { meta = { raw: String(log.meta) }; }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '4px 12px',
        borderBottom: '1px solid #1a1a1a',
        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
        fontSize: '0.76rem',
        lineHeight: 1.6,
        backgroundColor: isNew ? '#1a2a1a' : 'transparent',
        transition: 'background-color 1.5s ease',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ color: '#4b5563', minWidth: '72px', userSelect: 'none' }}>
        {showRelative ? relativeTime(log.created_at) : absTime(log.created_at)}
      </span>
      <span
        style={{
          color: levelColor(log.level),
          fontWeight: 700,
          minWidth: '44px',
          textTransform: 'uppercase',
          fontSize: '0.7rem',
        }}
      >
        {log.level}
      </span>
      <span style={{ color: '#e5e7eb', flex: 1, wordBreak: 'break-all' }}>
        {log.message}
        {meta && Object.keys(meta).length > 0 && (
          <span style={{ color: '#6b7280', marginLeft: '8px' }}>
            {JSON.stringify(meta)}
          </span>
        )}
      </span>
    </div>
  );
}

export default function LogViewer({
  logs,
  total,
  offset,
  LIMIT,
  levelFilter,
  setLevelFilter,
  searchInput,
  handleSearchInput,
  showRelative,
  setShowRelative,
  autoScroll,
  setAutoScroll,
  liveMode,
  setLiveMode,
  newLogIds,
  logsLoading,
  logsEndRef,
  downloadLogs,
  fetchLogs,
  timeframe,
  setTimeframe,
}) {
  const LEVELS = ['', 'info', 'warn', 'error'];
  const LEVEL_LABELS = { '': 'ALL', 'info': 'INFO', 'warn': 'WARN', 'error': 'ERROR' };
  const LEVEL_COLORS = { '': '#9ca3af', 'info': '#34d399', 'warn': '#fbbf24', 'error': '#f87171' };

  return (
    <div
      className="form-panel"
      style={{ 
        padding: 0, 
        overflow: 'hidden', 
        marginBottom: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '520px' 
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a1a',
        background: '#111',
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', marginRight: 4 }}>
          System Logs
        </span>
        <span style={{
          background: '#1a2a1a', color: '#34d399', fontSize: '0.7rem',
          padding: '2px 7px', borderRadius: '10px', fontWeight: 700,
        }}>
          {total.toLocaleString()} total
        </span>

        <div style={{ flex: 1 }} />

        {/* Level filter tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {LEVELS.map(l => (
            <button 
              key={l} 
              onClick={() => setLevelFilter(l)} 
              style={{
                padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
                borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: levelFilter === l ? LEVEL_COLORS[l] : '#1a1a1a',
                color: levelFilter === l ? '#000' : LEVEL_COLORS[l],
                transition: 'all 0.15s',
              }}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>

        {/* Timeframe selector */}
        <select
          value={timeframe}
          onChange={e => setTimeframe(e.target.value)}
          style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e5e7eb',
            borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Time</option>
          <option value="1h">Last 1 Hour</option>
          <option value="3h">Last 3 Hours</option>
          <option value="1d">Last 1 Day</option>
          <option value="1w">Last 1 Week</option>
          <option value="1m">Last 1 Month</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={searchInput}
          onChange={e => handleSearchInput(e.target.value)}
          style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e5e7eb',
            borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem',
            width: '160px', outline: 'none',
          }}
        />

        {/* Timestamp toggle */}
        <button 
          onClick={() => setShowRelative(r => !r)} 
          style={{
            padding: '4px 8px', fontSize: '0.72rem', background: '#1a1a1a',
            border: '1px solid #2a2a2a', borderRadius: '6px', color: '#9ca3af',
            cursor: 'pointer',
          }}
        >
          {showRelative ? 'Relative' : 'Absolute'}
        </button>

        {/* Auto-scroll */}
        <button 
          onClick={() => setAutoScroll(a => !a)} 
          style={{
            padding: '4px 8px', fontSize: '0.72rem',
            background: autoScroll ? '#1a2a1a' : '#1a1a1a',
            border: `1px solid ${autoScroll ? '#34d399' : '#2a2a2a'}`,
            borderRadius: '6px', color: autoScroll ? '#34d399' : '#9ca3af',
            cursor: 'pointer',
          }}
        >
          Follow
        </button>

        {/* Live SSE toggle */}
        <button 
          onClick={() => setLiveMode(l => !l)} 
          style={{
            padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
            background: liveMode ? '#7f1d1d' : '#1a1a1a',
            border: `1px solid ${liveMode ? '#f87171' : '#2a2a2a'}`,
            borderRadius: '6px', color: liveMode ? '#f87171' : '#9ca3af',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: liveMode ? '#f87171' : '#4b5563',
            display: 'inline-block',
            animation: liveMode ? 'pulse 1.2s infinite' : 'none',
          }} />
          {liveMode ? 'LIVE' : 'Live off'}
        </button>

        {/* Download */}
        <button 
          onClick={downloadLogs} 
          title="Download logs as .txt" 
          style={{
            padding: '4px 8px', fontSize: '0.72rem', background: '#1a1a1a',
            border: '1px solid #2a2a2a', borderRadius: '6px', color: '#9ca3af',
            cursor: 'pointer',
          }}
        >
          Export
        </button>

        {/* Manual refresh */}
        {!liveMode && (
          <button 
            onClick={() => fetchLogs(levelFilter, timeframe, searchInput, 0)} 
            style={{
              padding: '4px 8px', fontSize: '0.72rem', background: '#1a1a1a',
              border: '1px solid #2a2a2a', borderRadius: '6px', color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Log body */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#0a0a0a',
          minHeight: '400px',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: '0.8rem' }}>
              No logs found.
            </div>
          ) : (
            logs.map(log => (
              <LogLine
                key={log.id}
                log={log}
                showRelative={showRelative}
                isNew={newLogIds.has(log.id)}
              />
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Load More Pagination */}
      {!liveMode && logs.length > 0 && offset + LIMIT < total && (
        <div 
          style={{
            padding: '8px',
            textAlign: 'center',
            background: '#111',
            borderTop: '1px solid #1a1a1a',
          }}
        >
          <button
            onClick={() => fetchLogs(levelFilter, timeframe, searchInput, offset + LIMIT, true)}
            disabled={logsLoading}
            style={{
              padding: '6px 20px', fontSize: '0.78rem', background: '#1a1a2e',
              border: '1px solid #6366f1', borderRadius: '6px', color: '#818cf8',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            {logsLoading ? 'Loading...' : `Load more (${logs.length} / ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
