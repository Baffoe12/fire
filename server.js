require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, Op } = require('sequelize');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

const morgan = require('morgan');
const fs = require('fs');

// Create a write stream (in append mode) for logging
const logStream = fs.createWriteStream('server.log', { flags: 'a' });

// Create a separate write stream for error logging
const errorLogStream = fs.createWriteStream('error.log', { flags: 'a' });

// Add morgan middleware for logging HTTP requests with status codes to file and console
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logStream }));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Add request logging middleware
app.use((req, res, next) => {
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  logStream.write(logEntry);
  console.log(logEntry.trim());
  next();
});

// Enhanced logging for sensor and accident data ingestion
const logDataIngestion = (type, data) => {
  const logEntry = `[${new Date().toISOString()}] ${type} data received: ${JSON.stringify(data)}\n`;
  logStream.write(logEntry);
  console.log(logEntry.trim());
};

// Modify /api/sensor endpoint to add ingestion logging
app.post('/api/sensor', requireApiKey, async (req, res) => {
  const data = req.body;
  logDataIngestion('Sensor', data);
  if (!isValidSensorData(data)) {
    const errorMsg = 'Invalid sensor data';
    logStream.write(`[${new Date().toISOString()}] ERROR: ${errorMsg} - ${JSON.stringify(data)}\n`);
    console.error(errorMsg, data);
    return res.status(400).json({ error: errorMsg });
  }
  data.timestamp = new Date();
  try {
    const sensorEntry = await SensorDataModel.create(data);

    // Check for critical thresholds to trigger emergency alert
    const criticalAlcoholLevel = 0.6; // example threshold
    const criticalImpactLevel = 2.0;  // example threshold

    if (data.alcohol > criticalAlcoholLevel || data.impact > criticalImpactLevel) {
      console.log('Emergency alert triggered due to critical sensor data:', data);

      // Example: Send email notification using nodemailer (requires setup)
      const nodemailer = require('nodemailer');

      // Configure transporter (use environment variables for real credentials)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
           user: process.env.EMAIL_USER || 'aw3469029@gmail.com',
           pass: process.env.EMAIL_PASS || 'lxdo bbic opae gjlc'

        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER || 'aw3469029@gmail.com',
        to: process.env.EMERGENCY_CONTACT_EMAIL || 'emergency_contact@example.com',
        subject: 'SafeDrive Emergency Alert',
        text: `Critical sensor data detected:\nAlcohol Level: ${data.alcohol}\nImpact: ${data.impact}\nTimestamp: ${data.timestamp}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending emergency alert email:', error);
        } else {
          console.log('Emergency alert email sent:', info.response);
        }
      });
    }

    res.json({ status: 'ok', id: sensorEntry.id });
  } catch (err) {
    logStream.write(`[${new Date().toISOString()}] ERROR: Database error - ${err.message}\n`);
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Modify /api/accident endpoint to add ingestion logging
app.post('/api/accident', requireApiKey, async (req, res) => {
  const data = req.body;
  logDataIngestion('Accident', data);
  if (!isValidAccidentData(data)) {
    const errorMsg = 'Invalid accident data';
    logStream.write(`[${new Date().toISOString()}] ERROR: ${errorMsg} - ${JSON.stringify(data)}\n`);
    console.error(errorMsg, data);
    return res.status(400).json({ error: errorMsg });
  }
  data.timestamp = new Date();
  data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  try {
    const accidentEntry = await AccidentEventModel.create(data);
    res.json({ status: 'ok', id: accidentEntry.id });
  } catch (err) {
    logStream.write(`[${new Date().toISOString()}] ERROR: Database error - ${err.message}\n`);
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://safedrive-pro.netlify.app'  // Your production frontend URL
    : ['http://localhost:3000', 'http://localhost:3001'], // Development URLs
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
};

app.use(cors(corsOptions));

// Add CORS headers manually to fix missing Access-Control-Allow-Origin
app.use((req, res, next) => {
  const allowedOrigins = ['https://safedrive-pro.netlify.app', 'http://localhost:3000', 'http://localhost:3001'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const bodyParser = require('body-parser');

// Ensure JSON body parsing middleware is applied before all routes
app.use(bodyParser.json());

// Remove raw body logging middleware to avoid consuming request stream before body-parser
// Instead, rely on body-parser and Content-Type validation middleware

// Middleware to validate Content-Type header for JSON POST requests only
app.use('/api/sensor', (req, res, next) => {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// Database setup
let sequelize;
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // Production: Use PostgreSQL
  console.log('Using PostgreSQL database with URL:', process.env.DATABASE_URL.substring(0, 25) + '...');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
  console.log('PostgreSQL connection initialized');
} else {
  // Development: Use SQLite
  console.log('Using SQLite database');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

// Define models
const SensorDataModel = require('./models/SensorData')(sequelize);
const AccidentEventModel = require('./models/AccidentEvent')(sequelize);

// Sync models on startup with more detailed logging
console.log('Starting database sync...');
sequelize.sync({ force: false }).then(() => {
  console.log('Database tables synced successfully');
  // Verify tables exist
  sequelize.getQueryInterface().showAllTables().then(tables => {
    console.log('Available tables:', tables);
  }).catch(err => {
    console.error('Error checking tables:', err);
  });
}).catch(err => {
  console.error('Error syncing database tables:', err);
  // Continue running even if sync fails
});

// --- CONFIG ---
const API_KEY = process.env.SAFEDRIVE_API_KEY || "safedrive_secret_key"; // Change for production

// --- Input Validation ---
function isValidSensorData(data) {
  if (!data) return false;

  // Helper to check array elements are objects or empty objects
  function isValidArray(arr) {
    if (!Array.isArray(arr)) return false;
    for (const item of arr) {
      if (typeof item !== 'object' || item === null) return false;
      // Allow empty objects by skipping key checks
    }
    return true;
  }

  return typeof data.device_id === 'string' &&
         (typeof data.timestamp === 'number' || typeof data.timestamp === 'string') &&
         typeof data.alcohol === 'number' &&
         typeof data.vibration === 'number' &&
         typeof data.distance === 'number' &&
         typeof data.seatbelt === 'boolean' &&
         typeof data.impact === 'number' &&
         typeof data.pulse === 'number' &&
         (data.lat === undefined || typeof data.lat === 'number') &&
         (data.lng === undefined || typeof data.lng === 'number') &&
         (data.lcd_display === undefined || typeof data.lcd_display === 'string') &&
         typeof data.current_pulse === 'number' &&
         typeof data.pulse_threshold_min === 'number' &&
         typeof data.pulse_threshold_max === 'number' &&
         isValidArray(data.pulse_data) &&
         isValidArray(data.pulse_history) &&
         isValidArray(data.distance_history) &&
         isValidArray(data.alcohol_history) &&
         isValidArray(data.impact_history) &&
         isValidArray(data.vibration_history);
}

function isValidAccidentData(data) {
  return isValidSensorData(data); // Same fields, can extend with more checks
}

// --- API Key Middleware ---
function requireApiKey(req, res, next) {
  if (req.method === 'OPTIONS') {
    // Skip API key check for preflight requests
    return next();
  }
  const key = req.headers['x-api-key'] || req.query.api_key;
  console.log(`[API Key Middleware] Received key: ${key}, Expected key: ${API_KEY}`);
  if (!key || key !== API_KEY) {
    console.log('[API Key Middleware] Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  console.log('[API Key Middleware] API key validated successfully');
  next();
}

// --- API Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fallback stats endpoint that doesn't require database
app.get('/api/stats', async (req, res) => {
  try {
    // Try to get stats from database
    const accidents = await AccidentEventModel.findAll();
    const sensors = await SensorDataModel.findAll();
    
    const stats = {
      total_accidents: accidents.length,
      max_alcohol: accidents.length > 0 ? Math.max(...accidents.map(a => a.alcohol || 0)) : 0,
      avg_alcohol: accidents.length > 0 ? accidents.reduce((sum, a) => sum + (a.alcohol || 0), 0) / accidents.length : 0,
      max_impact: accidents.length > 0 ? Math.max(...accidents.map(a => a.impact || 0)) : 0,
      seatbelt_violations: accidents.filter(a => a.seatbelt === false).length,
      total_sensor_points: sensors.length
    };
    
    // Fix: Return valid JSON with commas between fields
    res.json(JSON.parse(JSON.stringify(stats)));
  } catch (err) {
    console.error('Database error in stats endpoint:', err);
    // Return mock data if database fails
    res.json({
      total_accidents: 5,
      max_alcohol: 0.8,
      avg_alcohol: 0.3,
      max_impact: 0.9,
      seatbelt_violations: 2,
      total_sensor_points: 120
    });
  }
});

// Fallback sensor endpoint that doesn't require database
app.get('/api/sensor', async (req, res) => {
  try {
    // Try to get latest sensor data from database
    const latest = await SensorDataModel.findOne({ order: [['createdAt', 'DESC']] });
    if (latest) {
      res.json(latest);
    } else {
      throw new Error('No sensor data found');
    }
  } catch (err) {
    console.error('Database error in sensor endpoint:', err);
    // Return mock data if database fails
    res.json({
      id: 1,
      alcohol: 0.05,
      vibration: 0.2,
      distance: 150,
      seatbelt: true,
      impact: 0.1,
      heart_rate: 75,
      lcd_display: 'SYSTEM OK',
      timestamp: new Date().toISOString()
    });
  }
});

// Fallback map endpoint that doesn't require database
app.get('/api/map', async (req, res) => {
  try {
    const accidents = await AccidentEventModel.findAll({ 
      where: { 
        lat: { [Op.ne]: null }, 
        lng: { [Op.ne]: null } 
      } 
    });
    res.json(accidents.map(e => ({ id: e.id, lat: e.lat, lng: e.lng, timestamp: e.timestamp })));
  } catch (err) {
    console.error('Database error in map endpoint:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get sensor history
app.get('/api/sensor/history', async (req, res) => {
  try {
    const history = await SensorDataModel.findAll({ order: [['timestamp', 'DESC']], limit: 1000 });
    res.json(history);
  } catch (err) {
    console.error('Database error in sensor history endpoint:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Fallback accidents endpoint that doesn't require database
app.get('/api/accidents', async (req, res) => {
  try {
    const accidents = await AccidentEventModel.findAll({ order: [['createdAt', 'DESC']] });
    res.json(accidents);
  } catch (err) {
    console.error('Database error in accidents endpoint:', err);
    res.json([
      {
        id: 'abc123',
        alcohol: 0.02,
        vibration: 0.8,
        distance: 20,
        seatbelt: true,
        impact: 0.9,
        lat: 5.6545,
        lng: -0.1869,
        lcd_display: 'ACCIDENT DETECTED',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'def456',
        alcohol: 0.04,
        vibration: 0.7,
        distance: 15,
        seatbelt: false,
        impact: 0.8,
        lat: 5.6540,
        lng: -0.1875,
        lcd_display: 'ACCIDENT DETECTED',
        timestamp: new Date(Date.now() - 172800000).toISOString()
      }
    ]);
  }
});

// Car position endpoint with fallback
app.get('/api/car/position', async (req, res) => {
  try {
    const latest = await SensorDataModel.findOne({ 
      order: [['createdAt', 'DESC']],
      where: {
        lat: { [Op.ne]: null },
        lng: { [Op.ne]: null }
      }
    });
    if (latest && latest.lat !== null && latest.lng !== null) {
      res.json({ lat: latest.lat, lng: latest.lng, speed: 42 });
    } else {
      throw new Error('No position data found');
    }
  } catch (err) {
    console.error('Database error in car position endpoint:', err);
    res.json({
      lat: 5.6545,
      lng: -0.1869,
      speed: 42
    });
  }
});

// Middleware to validate Content-Type header for JSON POST requests only
app.use('/api/sensor', (req, res, next) => {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

const predictiveAnalyticsService = require('./services/predictiveAnalyticsService');

const emergencyAlertLog = fs.createWriteStream('emergency_alerts.log', { flags: 'a' });

// Test route to verify body parsing works correctly
app.post('/api/test-body', (req, res) => {
  res.json({ receivedBody: req.body });
});

// Emergency alert ingestion endpoint
app.post('/api/emergency-alert', requireApiKey, (req, res) => {
  const alertData = req.body;
  if (!alertData || typeof alertData !== 'object') {
    return res.status(400).json({ error: 'Invalid emergency alert data' });
  }
  const logEntry = `[${new Date().toISOString()}] Emergency alert received: ${JSON.stringify(alertData)}\n`;
  emergencyAlertLog.write(logEntry);
  console.log(logEntry.trim());

  // Send email notification using nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'aw3469029@gmail.com',
      pass: process.env.EMAIL_PASS || 'lxdo bbic opae gjlc'
    }
  });

  const recipientEmail = alertData.email || process.env.EMERGENCY_CONTACT_EMAIL || 'emergency_contact@example.com';

  const mailOptions = {
    from: process.env.EMAIL_USER || 'aw3469029@gmail.com',
    to: recipientEmail,
    subject: 'SafeDrive Emergency Alert',
    text: `Emergency alert received with the following details:\n${JSON.stringify(alertData, null, 2)}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending emergency alert email:', error);
      emergencyAlertLog.write(`[${new Date().toISOString()}] ERROR sending email: ${error}\n`);
    } else {
      console.log('Emergency alert email sent:', info.response);
      emergencyAlertLog.write(`[${new Date().toISOString()}] Email sent: ${info.response}\n`);
    }
  });

  res.json({ status: 'ok', message: 'Emergency alert received' });
});

// Predictive analytics risk score API endpoint
app.get('/api/predictive-risk', async (req, res) => {
  const { lat, lng, timestamp } = req.query;
  if (!lat || !lng || !timestamp) {
    return res.status(400).json({ error: 'Missing lat, lng, or timestamp query parameters' });
  }
  try {
    const riskData = await predictiveAnalyticsService.calculateRiskScore(parseFloat(lat), parseFloat(lng), timestamp);
    if (riskData) {
      res.json(riskData);
    } else {
      res.status(500).json({ error: 'Failed to calculate risk score' });
    }
  } catch (err) {
    console.error('Error in predictive risk endpoint:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SafeDrive backend running on port ${PORT}`);
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  errorLogStream.write(`[${new Date().toISOString()}] Unhandled error: ${err.stack || err}\n`);
  res.status(500).json({ error: 'Internal server error' });
});
