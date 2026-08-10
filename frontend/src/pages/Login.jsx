import React, { useState, useEffect } from 'react';
import logo from '../assets/tce_logo.png';
import api from '../api/api';

export default function Login({ onAuthSuccess }) {
  const [mode, setMode] = useState('student');    // 'student' | 'admin'
  const [step, setStep] = useState('email');       // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const switchMode = (m) => {
    setMode(m); setStep('email');
    setError(null); setInfo(null);
    setEmail(''); setOtp(''); setPassword('');
  };

  const requestOTP = async (e) => {
    e.preventDefault();
    if (busy || cooldown > 0) return;
    setError(null); setBusy(true);
    try {
      await api.post('/auth/request-otp', { email });
      setStep('otp');
      setInfo(`OTP sent to ${email}`);
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally { setBusy(false); }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null); setBusy(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      onAuthSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally { setBusy(false); }
  };

  const adminLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null); setBusy(true);
    try {
      const res = await api.post('/auth/admin/login', { email, password });
      onAuthSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally { setBusy(false); }
  };

  return (
    <div className="login-root">
      {/* Left branding panel */}
      <div className="login-brand">
        <div className="login-brand-badge">TCE</div>
        <h1 className="login-brand-title">Bonafide Certificate Portal</h1>
        <p className="login-brand-sub">Thiagarajar College of Engineering, Madurai</p>
        <div className="login-brand-divider" />
        <p className="login-brand-desc">
          Apply for your bonafide certificate online.<br />
          Receive the document directly to your registered institutional email.
        </p>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">

          {/* Mode tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'student' ? 'active' : ''}`}
              onClick={() => switchMode('student')}
            >Student</button>
            <button
              className={`login-tab ${mode === 'admin' ? 'active' : ''}`}
              onClick={() => switchMode('admin')}
            >Admin</button>
            <button
              className={`login-tab ${mode === 'dev' ? 'active' : ''}`}
              onClick={() => switchMode('dev')}
            >Developer</button>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '24px' }}>
            <h2 className="login-form-heading">
              {mode === 'admin' ? 'Admin Sign In' : mode === 'dev' ? 'Developer Sign In' : step === 'otp' ? 'Verify OTP' : 'Sign In'}
            </h2>
            <p className="login-form-subheading">
              {mode === 'admin'
                ? 'Access the certificate management dashboard'
                : mode === 'dev'
                ? 'Access developer console telemetry logs'
                : step === 'otp'
                ? `Enter the 6-digit code sent to ${email}`
                : 'Enter your institutional email to continue'}
            </p>
          </div>

          {/* Alerts */}
          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-success">{info}</div>}

          {/* ── Student: Email step ── */}
          {mode === 'student' && step === 'email' && (
            <form onSubmit={requestOTP}>
              <div className="field-item" style={{ marginBottom: '20px' }}>
                <label className="field-label">Institutional Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="yourname@student.tce.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-primary login-submit-btn"
                disabled={busy || cooldown > 0}
              >
                {busy ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP →'}
              </button>
            </form>
          )}

          {/* ── Student: OTP step ── */}
          {mode === 'student' && step === 'otp' && (
            <form onSubmit={verifyOTP}>
              <div className="field-item" style={{ marginBottom: '20px' }}>
                <label className="field-label">6-Digit OTP</label>
                <input
                  type="text"
                  className="form-control otp-input"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
                <span className="field-hint">Check your email inbox (and spam folder)</span>
              </div>
              <button type="submit" className="btn-primary login-submit-btn" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify & Continue →'}
              </button>
              <button
                type="button"
                className="login-back-link"
                onClick={() => { setStep('email'); setError(null); setInfo(null); setOtp(''); }}
              >
                ← Use a different email
              </button>
            </form>
          )}

          {/* ── Admin ── */}
          {mode === 'admin' && (
            <form onSubmit={adminLogin}>
              <div className="field-item" style={{ marginBottom: '16px' }}>
                <label className="field-label">Admin Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="field-item" style={{ marginBottom: '20px' }}>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary login-submit-btn" disabled={busy}>
                {busy ? 'Signing In…' : 'Sign In →'}
              </button>
            </form>
          )}

          {/* ── Developer ── */}
          {mode === 'dev' && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setError(null); setBusy(true);
              try {
                const res = await api.post('/auth/dev/login', { email, password });
                onAuthSuccess(res.data.user);
              } catch (err) {
                setError(err.response?.data?.error || 'Invalid developer credentials.');
              } finally { setBusy(false); }
            }}>
              <div className="field-item" style={{ marginBottom: '16px' }}>
                <label className="field-label">Dev Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  placeholder="yourname@student.tce.edu"
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="field-item" style={{ marginBottom: '20px' }}>
                <label className="field-label">Access Token / Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary login-submit-btn" disabled={busy}>
                {busy ? 'Signing In…' : 'Sign In as Dev →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
