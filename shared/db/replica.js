// Replica is an alias to the primary database pool.
// Redis caching (30s admin list, 5min field config) handles read performance.
// A separate PostgreSQL replica is not needed at this scale.
const primary = require('./primary');
module.exports = primary;
