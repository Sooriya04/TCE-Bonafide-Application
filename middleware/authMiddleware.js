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
  const token = req.headers['x-dev-token'];
  const expectedToken = process.env.DEV_SECRET || 'dev_secret_tce_token';

  if (!token || token !== expectedToken) {
    return res.status(403).json({ error: 'Access denied. Valid dev token is required.' });
  }
  next();
};

module.exports = {
  checkAuth,
  checkAdmin,
  checkDev,
};
