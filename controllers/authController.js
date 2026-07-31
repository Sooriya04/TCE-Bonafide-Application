const crypto = require('crypto');
const bcrypt = require('bcrypt');
const redisClient = require('../cache/redis');
const replicaDb = require('../db/replica');
const primaryDb = require('../db/primary');
const { sendVerificationEmail } = require('../helper/emailHelper');

const requestOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 1. Look up student email in database
    const userRes = await replicaDb.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    let user = userRes.rows[0];

    // If student doesn't exist, we auto-create the student (since continue with google registration is gone)
    if (!user) {
      const nameFromEmail = email.split('@')[0].toUpperCase();
      const insertRes = await primaryDb.query(
        'INSERT INTO users (name, email, verified) VALUES ($1, $2, true) RETURNING *',
        [nameFromEmail, email]
      );
      user = insertRes.rows[0];
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const saltRounds = 10;
    const otpHash = await bcrypt.hash(otp, saltRounds);

    // 3. Store OTP in Redis (10 minutes TTL)
    await redisClient.set(`otp:${email}`, otpHash, 'EX', 600);

    // 4. Send Email
    await sendVerificationEmail(email, otp);

    return res.json({ success: true, message: 'OTP sent to email successfully.' });
  } catch (err) {
    req.log.error('OTP Request Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to send OTP.' });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const redisKey = `otp:${email}`;
    const storedHash = await redisClient.get(redisKey);

    if (!storedHash) {
      return res.status(400).json({ error: 'OTP expired or not found. Please request a new one.' });
    }

    // Validate limit of wrong attempts via Redis counter
    const attemptsKey = `otp_attempts:${email}`;
    const attempts = await redisClient.incr(attemptsKey);
    await redisClient.expire(attemptsKey, 600);

    if (attempts > 3) {
      await redisClient.del(redisKey);
      await redisClient.del(attemptsKey);
      return res.status(400).json({ error: 'Too many incorrect attempts. OTP invalidated.' });
    }

    const matches = await bcrypt.compare(otp, storedHash);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    // Clean up OTP & attempts keys
    await redisClient.del(redisKey);
    await redisClient.del(attemptsKey);

    // Fetch user details for session payload
    const userRes = await replicaDb.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    const user = userRes.rows[0];

    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'student',
    };

    return res.json({ success: true, user: req.session.user });
  } catch (err) {
    req.log.error('OTP Verification Error', { error: err.message });
    return res.status(500).json({ error: 'Failed to verify OTP.' });
  }
};

const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      req.log.error('Admin configuration missing in env credentials.');
      return res.status(500).json({ error: 'Admin auth configuration error.' });
    }

    if (email !== adminEmail) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, adminPasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.user = {
      email: adminEmail,
      role: 'admin',
      name: 'College Admin',
    };

    return res.json({ success: true, user: req.session.user });
  } catch (err) {
    req.log.error('Admin Login Error', { error: err.message });
    return res.status(500).json({ error: 'Internal server login error.' });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    return res.json({ success: true });
  });
};

const getMe = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ user: null });
  }
  return res.json({ user: req.session.user });
};

module.exports = {
  requestOTP,
  verifyOTP,
  adminLogin,
  logout,
  getMe,
};
