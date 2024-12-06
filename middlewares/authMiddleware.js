const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Expect "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Token decoded:', decoded);  
    req.user = decoded; // Make sure we set req.user correctly
    // console.log('Authenticated User in Middleware:', req.user);  
    next();
  } catch (error) {
    console.error('Token verification error:', error);  // Log any errors in token verification
    res.status(403).json({ message: 'Invalid token' });
  }
};
