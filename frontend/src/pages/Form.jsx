import React, { useState } from 'react';
import api from '../api/api';

const PAIRED_KEYS = new Set(['year', 'course']);

const STATIC_FIELDS = [
  { id: '1', key: 'title', label: 'Mr/Ms', field_type: 'select', options: ["Mr", "Ms"], placeholder: '', hint: '', required: true },
  { id: '2', key: 'name', label: 'Name (Initial at last)', field_type: 'text', options: [], placeholder: 'e.g., RAMESH R', hint: 'Enter your name with the initial at the end.', required: true },
  { id: '3', key: 'rollno', label: 'Roll No', field_type: 'text', options: [], placeholder: 'e.g., 660000', hint: 'Please enter your Roll Number. Do not enter Register Number.', required: true },
  { id: '4', key: 'relation', label: 'S/o or D/o', field_type: 'select', options: ["S/o ", "D/o "], placeholder: '', hint: '', required: true },
  { id: '5', key: 'parentName', label: 'Parent Name (including initial)', field_type: 'text', options: [], placeholder: 'e.g., R. Ramesh', hint: 'Parent initial should come first followed by name.', required: true },
  { id: '6', key: 'year', label: 'Year of study', field_type: 'select', options: ["I", "II", "III", "IV", "V"], placeholder: '', hint: '', required: true },
  { id: '7', key: 'course', label: 'Course', field_type: 'select', options: ["B.E", "B.Tech", "M.E", "MCA", "B.Arch", "M.Arch", "M.Plan", "M.Sc", "Part Time B.E", "B.Des"], placeholder: '', hint: '', required: true },
  { id: '8', key: 'branch', label: 'Branch', field_type: 'select', options: ["Architecture", "Civil Engineering", "Communication Systems", "Computer Applications", "Computer Science and Business Systems", "Computer Science and Engineering", "Computer Science and Engineering (AI & ML)", "Construction Engineering and Management", "Data Science (5 Years Integrated Course)", "Electrical and Computer Engineering", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Electronics Engineering (VLSI Design & Tech.)", "Embedded System Technologies", "Fashion Technology", "Information Technology", "Interior Design", "Mechanical Engineering", "Mechatronics", "Structural Engineering", "Urban Planning"], placeholder: '', hint: '', required: true },
  { id: '9', key: 'certificateFor', label: 'Certificate For', field_type: 'select', options: ["Educational Loan", "Scholarship", "Bus Pass", "Passport", "VISA", "Custom"], placeholder: '', hint: '', required: true },
  { id: '10', key: 'scholarshipType', label: 'Scholarship Type (If Scholarship selected)', field_type: 'text', options: [], placeholder: 'e.g., Post Metric Scholarship', hint: 'Required if you chose Scholarship.', required: false }
];

export default function Form() {
  const [fields] = useState(STATIC_FIELDS);
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    rollno: '',
    relation: '',
    parentName: '',
    year: '',
    course: '',
    branch: '',
    certificateFor: '',
    scholarshipType: ''
  });
  const [loading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const change = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const openPreview = (e) => {
    e.preventDefault();
    setError(null);
    setIsPreview(true);
  };

  const confirmSubmit = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/bonafide/submit', formData);
      setSuccess(true);
      setIsPreview(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
      setIsPreview(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field) => {
    const opts = typeof field.options === 'string' ? JSON.parse(field.options) : (field.options || []);
    if (field.key === 'scholarshipType' && formData.certificateFor !== 'Scholarship') return null;

    const input = field.field_type === 'select' ? (
      <select
        className="form-select"
        value={formData[field.key] || ''}
        onChange={e => change(field.key, e.target.value)}
        required={field.required}
      >
        <option value="" disabled>Select…</option>
        {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
      </select>
    ) : (
      <input
        type={field.field_type || 'text'}
        className="form-control"
        placeholder={field.placeholder || ''}
        value={formData[field.key] || ''}
        onChange={e => change(field.key, e.target.value)}
        required={field.required && field.key !== 'scholarshipType'}
      />
    );

    return (
      <div className="field-item" key={field.id}>
        <label className="field-label">
          {field.label}
          {field.required && <span className="required">*</span>}
        </label>
        {input}
        {field.hint && <span className="field-hint">{field.hint}</span>}
      </div>
    );
  };

  /* ── Group Year + Course side-by-side ── */
  const renderFields = () => {
    const out = [];
    let pairBuffer = [];

    fields.forEach((field, idx) => {
      if (field.key === 'scholarshipType' && formData.certificateFor !== 'Scholarship') return;

      if (PAIRED_KEYS.has(field.key)) {
        pairBuffer.push(field);
        if (pairBuffer.length === 2) {
          out.push(
            <div className="field-row" key={`pair-${idx}`}>
              {pairBuffer.map(f => renderField(f))}
            </div>
          );
          pairBuffer = [];
        }
      } else {
        if (pairBuffer.length) {
          // flush orphan
          pairBuffer.forEach(f => out.push(renderField(f)));
          pairBuffer = [];
        }
        out.push(renderField(field));
      }
    });

    if (pairBuffer.length) pairBuffer.forEach(f => out.push(renderField(f)));
    return out;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Loading application form…
      </div>
    );
  }

  /* ── Success ── */
  if (success) {
    return (
      <div className="page-container">
        <div className="form-panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✓</div>
          <h2 style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
            Application Submitted
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '28px' }}>
            Your bonafide certificate request has been registered. The certificate will be forwarded to the administrative office.
          </p>
          <button className="btn-primary" onClick={() => { setSuccess(false); setFormData(Object.fromEntries(fields.map(f => [f.key, '']))); }}>
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  /* ── Preview ── */
  if (isPreview) {
    const visibleFields = fields.filter(f => {
      if (f.key === 'scholarshipType' && formData.certificateFor !== 'Scholarship') return false;
      return true;
    });

    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Review Application</h1>
          <p>Please verify all details before submitting. This cannot be undone.</p>
        </div>

        <div className="form-panel">
          {error && <div className="alert alert-error">{error}</div>}

          {visibleFields.map(f => (
            <div className="preview-row" key={f.id}>
              <span className="preview-key">{f.label}</span>
              <span className="preview-val">{formData[f.key] || <em style={{ color: 'var(--text-light)' }}>Not provided</em>}</span>
            </div>
          ))}

          <div className="action-row">
            <button className="btn-secondary" onClick={() => setIsPreview(false)}>
              ← Edit Details
            </button>
            <button className="btn-primary" onClick={confirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Bonafide Certificate Application</h1>
        <p>Complete all required fields to generate your bonafide certificate</p>
      </div>

      <div className="form-panel">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={openPreview}>
          <div className="field-group">
            {renderFields()}
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 32px' }}>
              Preview & Continue →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
