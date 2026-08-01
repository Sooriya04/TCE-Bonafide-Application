import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function History() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/bonafide/student/forms')
      .then(res => {
        setRequests(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch request history.');
        setLoading(false);
      });
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Loading request history…
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Applications</h1>
        <p>Track the status of your submitted bonafide certificate requests</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {requests.length === 0 ? (
        <div className="form-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          You haven't submitted any requests yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map(req => (
            <div className="student-req-card" key={req.id}>
              {/* Card Header */}
              <div className="student-req-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div>
                  <h3 className="student-req-purpose">{req.form_data?.certificateFor || 'Bonafide Certificate'}</h3>
                  <p className="student-req-date">Submitted on {formatDate(req.created_at)}</p>
                </div>
                <span className={`badge ${req.downloaded ? 'badge-done' : 'badge-pending'}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {req.downloaded ? 'Approved' : 'Pending'}
                </span>
              </div>

              {/* Card Details Grid */}
              <div className="student-req-card-details">
                <div className="detail-col">
                  <span className="detail-label">Name</span>
                  <span className="detail-val">{req.form_data?.name || '—'}</span>
                </div>
                <div className="detail-col">
                  <span className="detail-label">Roll Number</span>
                  <span className="detail-val" style={{ fontFamily: 'monospace' }}>{req.form_data?.rollno || '—'}</span>
                </div>
                <div className="detail-col">
                  <span className="detail-label">Course & Year</span>
                  <span className="detail-val">{req.form_data?.course || '—'} - Year {req.form_data?.year || '—'}</span>
                </div>
                <div className="detail-col">
                  <span className="detail-label">Branch</span>
                  <span className="detail-val">{req.form_data?.branch || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
