import React from 'react';

export default function DevManagement({
  devs,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  formSubmitting,
  handleAddDev,
  handleRevokeDev,
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
      {/* Add Developer */}
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
            {formSubmitting ? 'Adding...' : 'Add Developer'}
          </button>
        </form>
      </div>

      {/* Developers List */}
      <div className="form-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>Registered Developers</h2>
        <div className="data-table-wrap" style={{ maxHeight: '260px' }}>
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
                    No developers registered.
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
                        Revoke
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
  );
}
