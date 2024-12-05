const express = require('express');
const router = express.Router();
const { signup, login, getUserDetails } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

// Signup route
router.post('/signup', signup);

// Login route
router.post('/login', login);

//Get user details route
router.get('/profile', authenticate, getUserDetails);

module.exports = router;
