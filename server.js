const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

// Connect to the database
connectDB();

// Start the server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
