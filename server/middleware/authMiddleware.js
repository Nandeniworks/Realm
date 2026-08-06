import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Expecting format "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required', code: 'TOKEN_MISSING' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'realm_jwt_access_secret_key_2026_xYz', (err, user) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({ 
        error: isExpired ? 'Access token expired' : 'Invalid access token', 
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID' 
      });
    }
    req.user = user;
    next();
  });
};
