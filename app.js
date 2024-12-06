const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Import routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// const reportRoutes = require('./routes/reportRoutes');
// const contactRoutes = require('./routes/contactRoutes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/contact', contactRoutes);

// Test
app.use('/', (req, res) => {
    res.send('<h1>Hello World</h1>')
})

// Error handling middleware (for uncaught routes)
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
