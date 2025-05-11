require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, Op } = require('sequelize');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://safedrive-pro.netlify.app']  // Your production frontend URL
    : ['http://localhost:3000', 'http://localhost:3001'], // Development URLs
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

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
  return typeof data.alcohol === 'number' &&
         typeof data.vibration === 'number' &&
         typeof data.distance === 'number' &&
         typeof data.seatbelt === 'boolean' &&
         typeof data.impact === 'number' &&
         (data.lat === undefined || typeof data.lat === 'number') &&
         (data.lng === undefined || typeof data.lng === 'number') &&
         (data.lcd_display === undefined || typeof data.lcd_display === 'string');
}

function isValidAccidentData(data) {
  return isValidSensorData(data); // Same fields, can extend with more checks
}

// --- API Key Middleware ---
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
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
    
    res.json(stats);
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
    // Return mock data if database fails
    res.json([
      { id: 'abc123', lat: 5.6545, lng: -0.1869, timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'def456', lat: 5.6540, lng: -0.1875, timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: 'ghi789', lat: 5.6550, lng: -0.1880, timestamp: new Date(Date.now() - 259200000).toISOString() }
    ]);
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
    // Return mock data if database fails
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
    if (latest && latest.lat && latest.lng) {
      res.json({ lat: latest.lat, lng: latest.lng, speed: 42 });
    } else {
      throw new Error('No position data found');
    }
  } catch (err) {
    console.error('Database error in car position endpoint:', err);
    // Return mock data if database fails
    res.json({
      lat: 5.6545, // University of Ghana, Legon
      lng: -0.1869,
      speed: 42 // km/h, mock value
    });
  }
});

// Receive sensor data (live updates, with API key)
app.post('/api/sensor', requireApiKey, async (req, res) => {
  const data = req.body;
  if (!isValidSensorData(data)) return res.status(400).json({ error: 'Invalid sensor data' });
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
          user: process.env.EMAIL_USER || 'your_email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your_email_password'
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your_email@gmail.com',
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
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Receive accident event (with API key)
app.post('/api/accident', requireApiKey, async (req, res) => {
  const data = req.body;
  if (!isValidAccidentData(data)) return res.status(400).json({ error: 'Invalid accident data' });
  data.timestamp = new Date();
  data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  try {
    const accidentEntry = await AccidentEventModel.create(data);
    res.json({ status: 'ok', id: accidentEntry.id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get accident details by ID
app.get('/api/accident/:id', async (req, res) => {
  try {
    const found = await AccidentEventModel.findOne({ where: { id: req.params.id } });
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json(found);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/emergency-alert', async (req, res) => {
  const { email, latitude, longitude } = req.body;
  if (!email || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing email or location data' });
  }

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
    to: email,
    subject: 'SafeDrive Emergency Alert',
    text: `An emergency alert has been triggered.\nLocation: https://www.google.com/maps?q=${latitude},${longitude}\nPlease respond immediately.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ status: 'ok', message: 'Emergency alert email sent' });
  } catch (error) {
    console.error('Error sending emergency alert email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});
const accidentSeeder = require('./seeders/20250423201000-demo-accident-event');
const sensorSeeder = require('./seeders/20250423201300-demo-sensor-data');
const additionalSensorSeeder = require('./seeders/20250423201400-additional-sensor-data');

// API endpoint to trigger seeders programmatically (secured with API key)
app.post('/api/seed', requireApiKey, async (req, res) => {
  try {
    // Run accident seeder
    await accidentSeeder.up(sequelize.getQueryInterface(), Sequelize);
    // Run sensor seeders
    await sensorSeeder.up(sequelize.getQueryInterface(), Sequelize);
    await additionalSensorSeeder.up(sequelize.getQueryInterface(), Sequelize);

    res.json({ status: 'ok', message: 'Seeders executed successfully' });
  } catch (err) {
    console.error('Error running seeders:', err);
    res.status(500).json({ error: 'Failed to run seeders', details: err.message });
  }
});

// Serve static files from the React app 
app.listen(PORT, () => {
  console.log(`SafeDrive backend running on port ${PORT}`);
});
