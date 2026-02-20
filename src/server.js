require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const imageRoutes = require('./routes/imageRoutes');

const app = express();
const PORT = process.env.PORT || 3500; // Use 3500 as seen in logs

app.use(cors());
app.use(morgan('dev'));
// Increase JSON limit just in case for large folder updates
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/images', imageRoutes);

// Serve images from filesystem
app.use('/api/raw', express.static('/'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Catch-all for API 404s to help debugging
app.use('/api', (req, res) => {
  console.log(`404 at ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route ${req.originalUrl} not found on this server` });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
