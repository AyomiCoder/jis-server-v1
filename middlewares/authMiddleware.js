const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; 
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Token decoded:', decoded);  
    req.user = decoded; 
    // console.log('Authenticated User in Middleware:', req.user);  
    next();
  } catch (error) {
    console.error('Token verification error:', error); 
    res.status(403).json({ message: 'Invalid token' });
  }
};
