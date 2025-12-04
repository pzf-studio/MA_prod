const adminAuth = require('../../static/admin/admin-auth.js');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify token using your existing adminAuth system
    const isAuthenticated = await adminAuth.verifyToken(token);
    
    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid.' });
  }
};

module.exports = auth;