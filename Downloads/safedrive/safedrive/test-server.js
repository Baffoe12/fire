const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    message: 'SafeDrive Pro API is running!'
  });
});

// Mock sensor data endpoint
app.get('/api/sensor', (req, res) => {
  res.json({
    id: 1,
    alcohol: 0.05,
    vibration: 0.2,
    distance: 150,
    seatbelt: true,
    impact: 0.1,
    lcd_display: 'SYSTEM OK',
    timestamp: new Date().toISOString()
  });
});

// Mock stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    total_accidents: 5,
    max_alcohol: 0.8,
    avg_alcohol: 0.3,
    max_impact: 0.9,
    seatbelt_violations: 2,
    total_sensor_points: 120
  });
});

// Mock car position endpoint
app.get('/api/car/position', (req, res) => {
  res.json({
    lat: 5.6545, // University of Ghana, Legon
    lng: -0.1869,
    speed: 42 // km/h, mock value
  });
});

app.listen(PORT, () => {
  console.log(`SafeDrive test backend running on port ${PORT}`);
});
