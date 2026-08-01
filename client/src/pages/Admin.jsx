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

  const fetchForms = (p) => {
    setLoading(true);
    api.get(`/bonafide/admin/forms?page=${p}`)
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

  useEffect(() => { fetchForms(page); }, [page]);

  // Recalculate pending count dynamically when forms list changes
  useEffect(() => {
    setPending(forms.filter(f => !f.downloaded).length);
  }, [forms]);

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
          ⚙ Developer Console
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map(form => (
                  <tr key={form.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{form.form_data?.rollno || '—'}</td>
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
                        ↓ Download DOCX
                      </button>
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
            ← Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
