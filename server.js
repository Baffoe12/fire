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
  if (!data) return false;
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
    if (latest && latest.lat !== null && latest.lng !== null) {
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
  console.log('Raw sensor data received:', JSON.stringify(data)); // Add detailed logging
  if (!isValidSensorData(data)) {
    console.error('Invalid sensor data:', JSON.stringify(data));
    return res.status(400).json({ error: 'Invalid sensor data' });
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

/**
 * Emergency alert email sending endpoint.
 * Requires environment variables:
 *   EMAIL_USER - email address used to send emails
 *   EMAIL_PASS - password or app-specific password for the email account
 *   EMERGENCY_CONTACT_EMAIL - default recipient email if none provided in request
 */

const emailUser = process.env.EMAIL_USER || 'aw3469029@gmail.com';
const emailPass = process.env.EMAIL_PASS || 'lxdo bbic opae gjlc';
const emergencyContactEmail = process.env.EMERGENCY_CONTACT_EMAIL || 'emergency_contact@example.com';

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

app.post('/api/emergency-alert', async (req, res) => {
  const { email, latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing location data (latitude or longitude)' });
  }
  // Use provided email or fallback to emergency contact email
  const recipientEmail = email || emergencyContactEmail;
  if (!recipientEmail) {
    return res.status(400).json({ error: 'No recipient email provided and EMERGENCY_CONTACT_EMAIL is not set' });
  }

  const mailOptions = {
    from: emailUser,
    to: recipientEmail,
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

app.post('/api/seed', async (req, res) => {
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


const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Serve static files from the React app 

// PDF report generation endpoint
app.get('/api/reports/pdf', async (req, res) => {
  try {
    // Fetch recent accident events and sensor data (limit to 50 for report)
    const accidents = await AccidentEventModel.findAll({
      order: [['timestamp', 'DESC']],
      limit: 50
    });
    const sensors = await SensorDataModel.findAll({
      order: [['timestamp', 'DESC']],
      limit: 50
    });

    // Create a new PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="safedrive_report.pdf"');

    // Pipe PDF document to response
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('SafeDrive Report', { align: 'center' });
    doc.moveDown();

    // Accidents section
    doc.fontSize(16).text('Recent Accident Events', { underline: true });
    doc.moveDown(0.5);

    accidents.forEach((accident, index) => {
      doc.fontSize(12).text(`${index + 1}. ID: ${accident.id}`);
      doc.text(`   Alcohol: ${accident.alcohol}`);
      doc.text(`   Impact: ${accident.impact}`);
      doc.text(`   Seatbelt: ${accident.seatbelt ? 'Fastened' : 'Unfastened'}`);
      doc.text(`   Location: (${accident.lat || 'N/A'}, ${accident.lng || 'N/A'})`);
      doc.text(`   Timestamp: ${accident.timestamp}`);
      doc.moveDown(0.5);
    });

    doc.addPage();

    // Sensors section
    doc.fontSize(16).text('Recent Sensor Data', { underline: true });
    doc.moveDown(0.5);

    sensors.forEach((sensor, index) => {
      doc.fontSize(12).text(`${index + 1}. ID: ${sensor.id}`);
      doc.text(`   Alcohol: ${sensor.alcohol}`);
      doc.text(`   Impact: ${sensor.impact}`);
      doc.text(`   Seatbelt: ${sensor.seatbelt ? 'Fastened' : 'Unfastened'}`);
      doc.text(`   Distance: ${sensor.distance}`);
      doc.text(`   Vibration: ${sensor.vibration}`);
      doc.text(`   Heart Rate: ${sensor.heart_rate || 'N/A'}`);
      doc.text(`   Timestamp: ${sensor.timestamp}`);
      doc.moveDown(0.5);
    });

    // Finalize PDF and end the stream
    doc.end();

  } catch (err) {
    console.error('Error generating PDF report:', err);
    res.status(500).json({ error: 'Failed to generate PDF report', details: err.message });
  }
});


// Excel report generation endpoints

// Accident events Excel report
app.get('/api/reports/accident-excel', async (req, res) => {
  try {
    const accidents = await AccidentEventModel.findAll({
      order: [['timestamp', 'DESC']],
      limit: 1000
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Accident Events');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Alcohol', key: 'alcohol', width: 10 },
      { header: 'Impact', key: 'impact', width: 10 },
      { header: 'Seatbelt', key: 'seatbelt', width: 10 },
      { header: 'Latitude', key: 'lat', width: 15 },
      { header: 'Longitude', key: 'lng', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 25 }
    ];

    accidents.forEach(accident => {
      sheet.addRow({
        id: accident.id,
        alcohol: accident.alcohol,
        impact: accident.impact,
        seatbelt: accident.seatbelt ? 'Fastened' : 'Unfastened',
        lat: accident.lat || 'N/A',
        lng: accident.lng || 'N/A',
        timestamp: accident.timestamp
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="accident_events.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating accident Excel report:', err);
    res.status(500).json({ error: 'Failed to generate accident Excel report', details: err.message });
  }
});

// Sensor data Excel report
app.get('/api/reports/sensor-excel', async (req, res) => {
  try {
    const sensors = await SensorDataModel.findAll({
      order: [['timestamp', 'DESC']],
      limit: 1000
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sensor Data');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Alcohol', key: 'alcohol', width: 10 },
      { header: 'Impact', key: 'impact', width: 10 },
      { header: 'Seatbelt', key: 'seatbelt', width: 10 },
      { header: 'Distance', key: 'distance', width: 10 },
      { header: 'Vibration', key: 'vibration', width: 10 },
      { header: 'Heart Rate', key: 'heart_rate', width: 10 },
      { header: 'Timestamp', key: 'timestamp', width: 25 }
    ];

    sensors.forEach(sensor => {
      sheet.addRow({
        id: sensor.id,
        alcohol: sensor.alcohol,
        impact: sensor.impact,
        seatbelt: sensor.seatbelt ? 'Fastened' : 'Unfastened',
        distance: sensor.distance,
        vibration: sensor.vibration,
        heart_rate: sensor.heart_rate || 'N/A',
        timestamp: sensor.timestamp
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sensor_data.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating sensor Excel report:', err);
    res.status(500).json({ error: 'Failed to generate sensor Excel report', details: err.message });
  }
});

// Statistics Excel report
app.get('/api/reports/stats-excel', async (req, res) => {
  try {
    // Gather statistics similar to /api/stats endpoint
    const accidents = await AccidentEventModel.findAll();
    const sensors = await SensorDataModel.findAll();

    const total_accidents = accidents.length;
    const max_alcohol = total_accidents > 0 ? Math.max(...accidents.map(a => a.alcohol || 0)) : 0;
    const avg_alcohol = total_accidents > 0 ? accidents.reduce((sum, a) => sum + (a.alcohol || 0), 0) / total_accidents : 0;
    const max_impact = total_accidents > 0 ? Math.max(...accidents.map(a => a.impact || 0)) : 0;
    const seatbelt_violations = accidents.filter(a => a.seatbelt === false).length;
    const total_sensor_points = sensors.length;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Statistics');

    sheet.columns = [
      { header: 'Statistic', key: 'stat', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    sheet.addRow({ stat: 'Total Accidents', value: total_accidents });
    sheet.addRow({ stat: 'Max Alcohol Level', value: max_alcohol });
    sheet.addRow({ stat: 'Average Alcohol Level', value: avg_alcohol });
    sheet.addRow({ stat: 'Max Impact', value: max_impact });
    sheet.addRow({ stat: 'Seatbelt Violations', value: seatbelt_violations });
    sheet.addRow({ stat: 'Total Sensor Data Points', value: total_sensor_points });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="statistics_report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating statistics Excel report:', err);
    res.status(500).json({ error: 'Failed to generate statistics Excel report', details: err.message });
  }
});

const environmentalDataService = require('./services/environmentalDataService');

// Environmental data API endpoint
app.get('/api/environmental-data', async (req, res) => {
  const { lat, lng, timestamp } = req.query;
  if (!lat || !lng || !timestamp) {
    return res.status(400).json({ error: 'Missing lat, lng, or timestamp query parameters' });
  }
  try {
    console.log(`Received environmental data request with lat=${lat}, lng=${lng}, timestamp=${timestamp}`);
    const data = await environmentalDataService.getWeatherData(parseFloat(lat), parseFloat(lng), timestamp);
    if (data) {
      console.log('Environmental data fetched successfully');
      res.json(data);
    } else {
      console.error('Failed to fetch environmental data');
      res.status(500).json({ error: 'Failed to fetch environmental data' });
    }
  } catch (err) {
    console.error('Error in environmental data endpoint:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const predictiveAnalyticsService = require('./services/predictiveAnalyticsService');

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
    // Send detailed error message for debugging
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
