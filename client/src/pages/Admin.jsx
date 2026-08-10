import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function Admin() {
  const [forms, setForms] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Search filter states
  const [searchRollNo, setSearchRollNo] = useState('');
  const [searchName, setSearchName] = useState('');
  const [activeRollNo, setActiveRollNo] = useState('');
  const [activeName, setActiveName] = useState('');

  // History drawer states
  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchForms = (p, roll = activeRollNo, nm = activeName) => {
    setLoading(true);
    api.get(`/bonafide/admin/forms?page=${p}&rollno=${roll}&name=${nm}`)
      .then(res => {
        const data = res.data;
        setForms(data.forms);
        setTotalPages(data.totalPages);
        setTotal(data.totalCount ?? data.forms.length);
        setPending(data.forms.filter(f => !f.downloaded).length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchForms(page, activeRollNo, activeName);
  }, [page, activeRollNo, activeName]);

  // Recalculate pending count dynamically when forms list changes
  useEffect(() => {
    setPending(forms.filter(f => !f.downloaded).length);
  }, [forms]);

  // Escape key handler for drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDrawer(false);
      }
    };
    if (showDrawer) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDrawer]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveRollNo(searchRollNo);
    setActiveName(searchName);
  };

  const handleClearSearch = () => {
    setSearchRollNo('');
    setSearchName('');
    setPage(1);
    setActiveRollNo('');
    setActiveName('');
  };

  const handleViewHistory = async (rollno) => {
    setSelectedStudentRoll(rollno);
    setShowDrawer(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/bonafide/admin/student/${rollno}/history`);
      setStudentHistory(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load student history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleDownloaded = async (id, current) => {
    setActionLoading(id);
    try {
      await api.patch(`/bonafide/admin/forms/${id}/downloaded`, { downloaded: !current });
      setForms(prev => prev.map(f => f.id === id ? { ...f, downloaded: !current } : f));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (id, rollno) => {
    try {
      const res = await api.get(`/bonafide/download/${id}`, { responseType: 'blob' });
      
      // Update local state to downloaded true instantly on success
      setForms(prev => prev.map(f => f.id === id ? { ...f, downloaded: true } : f));
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bonafide-${rollno || id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="admin-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Certificate Requests</h1>
          <p>Manage and download student bonafide certificate applications</p>
        </div>
        <a 
          href="/admin/dev" 
          className="btn-secondary" 
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        >
          Developer Console
        </a>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{total - pending}</div>
          <div className="stat-label">Downloaded</div>
        </div>
      </div>

      {/* Search and Filters */}
      <form className="admin-filters-bar" onSubmit={handleSearchSubmit}>
        <div className="filter-group">
          <label htmlFor="search-rollno">Roll No</label>
          <input 
            type="text" 
            id="search-rollno" 
            className="filter-input" 
            placeholder="Search by Roll No..."
            value={searchRollNo}
            onChange={(e) => setSearchRollNo(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="search-name">Student Name</label>
          <input 
            type="text" 
            id="search-name" 
            className="filter-input" 
            placeholder="Search by Name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
            Search
          </button>
          <button type="button" className="btn-secondary" onClick={handleClearSearch} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
            Clear
          </button>
        </div>
      </form>

      {/* Table Panel */}
      <div className="form-panel" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Loading requests…
          </div>
        ) : forms.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No certificate requests found.
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Branch</th>
                  <th>Purpose</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                  <th style={{ textAlign: 'right' }}>History</th>
                </tr>
              </thead>
              <tbody>
                {forms.map(form => (
                  <tr key={form.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                      {form.form_data?.rollno || '—'}
                    </td>
                    <td>{form.form_data?.name || '—'}</td>
                    <td style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {form.form_data?.branch || '—'}
                    </td>
                    <td>{form.form_data?.certificateFor || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(form.created_at)}</td>
                    <td>
                      <button
                        onClick={() => toggleDownloaded(form.id, form.downloaded)}
                        disabled={actionLoading === form.id}
                        className={`badge ${form.downloaded ? 'badge-done' : 'badge-pending'}`}
                        style={{ cursor: 'pointer', border: 'none', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {actionLoading === form.id ? '…' : form.downloaded ? 'Downloaded' : 'Pending'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleDownload(form.id, form.form_data?.rollno)}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        Download DOCX
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {form.form_data?.rollno ? (
                        <button
                          onClick={() => handleViewHistory(form.form_data.rollno)}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        >
                          View History
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            Next
          </button>
        </div>
      )}

      {/* History Drawer */}
      {showDrawer && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Student History — {selectedStudentRoll}</h2>
              <button className="drawer-close-btn" onClick={() => setShowDrawer(false)} aria-label="Close drawer">
                Close
              </button>
            </div>
            <div className="drawer-body">
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  Loading student history...
                </div>
              ) : studentHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No prior submissions found for this student.
                </div>
              ) : (
                <div>
                  {studentHistory.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-header">
                        <span className="history-purpose" style={{ fontWeight: '600', color: 'var(--accent)' }}>
                          {item.form_data?.certificateFor || '—'}
                        </span>
                        <span className="history-date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <div className="history-details" style={{ marginTop: '8px' }}>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Name: </span>
                          <span className="history-detail-val">{item.form_data?.name || '—'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Branch: </span>
                          <span className="history-detail-val">{item.form_data?.branch || '—'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Academic Year: </span>
                          <span className="history-detail-val">{item.form_data?.academicYear || '—'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Status: </span>
                          <span className="history-detail-val" style={{ color: item.downloaded ? 'var(--success)' : 'var(--warning)' }}>
                            {item.downloaded ? 'Downloaded' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
