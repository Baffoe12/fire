# SafeDrive Pro - IoT Vehicle Safety Monitoring System

## Overview

SafeDrive Pro is a comprehensive IoT-based vehicle safety monitoring system that integrates ESP32 firmware, a Node.js backend, and a React dashboard to provide real-time monitoring of various vehicle safety parameters.

![SafeDrive Pro Dashboard](https://i.imgur.com/example.png)

## Features

- **Real-time Sensor Monitoring**: Tracks alcohol levels, vibration, proximity, impact, and seatbelt status
- **Driver Heart Rate Monitoring**: Monitors driver heart rate to detect fatigue and health emergencies
- **Accident Detection**: Automatically detects accidents and records location data
- **Emergency Response**: Sends alerts and makes emergency calls when accidents are detected
- **Data Visualization**: Interactive dashboard with real-time updates and historical data
- **Evidence Collection**: Automatically saves sensor data when the engine stops
- **Export Capabilities**: Download sensor data in various formats for insurance or legal purposes

## System Architecture

The system consists of three main components:

1. **ESP32 Firmware**: Collects data from sensors and sends it to the backend
2. **Node.js Backend**: Processes and stores sensor data, provides API endpoints
3. **React Dashboard**: Visualizes data and provides user interface for monitoring

## Technology Stack

- **Frontend**: React, Material-UI, Framer Motion
- **Backend**: Node.js, Express, Sequelize
- **Database**: SQLite (development), PostgreSQL (production)
- **IoT Hardware**: ESP32, various sensors (MQ-3, MPU6050, ultrasonic, etc.)
- **Communication**: HTTP/REST API

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PlatformIO (for ESP32 firmware)

### Backend Setup

```bash
cd backend
npm install
npm start
```

### Frontend Setup

```bash
cd dashboard
npm install
npm start
```

### ESP32 Firmware

Open the project in PlatformIO and upload to your ESP32 device.

## Deployment

The system can be deployed to various cloud platforms:

- Backend: Render, Heroku, or Railway
- Frontend: Netlify, Vercel, or GitHub Pages
- Database: PostgreSQL on Render or Supabase

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors who have helped develop this system
- Special thanks to the open-source community for providing libraries and tools
