const checkAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please login first.' });
  }
  next();
};

const checkAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};

const checkDev = (req, res, next) => {
  // Allow admins and developers via session, OR fallback to dev token check
  if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'dev' || req.session.user.role === 'developer')) {
    return next();
  }

  const token = req.headers['x-dev-token'];
  const expectedToken = process.env.DEV_SECRET;

  if (!token || token !== expectedToken) {
    return res.status(403).json({ error: 'Access denied. Valid credentials or dev token is required.' });
  }
  next();
};

module.exports = {
  checkAuth,
  checkAdmin,
  checkDev,
};
