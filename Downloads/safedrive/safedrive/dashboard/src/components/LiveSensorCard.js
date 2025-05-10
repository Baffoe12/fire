import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Chip, Stack, Box, Paper, Button, Snackbar, Alert } from '@mui/material';
import SensorsIcon from '@mui/icons-material/Sensors';
import SaveIcon from '@mui/icons-material/Save';
import { motion } from 'framer-motion';
import api from '../api'; // Import the API utility

function statusColor(val, type) {
  if (type === 'alcohol') return val > 600 ? 'error' : val > 300 ? 'warning' : 'success';
  if (type === 'vibration') return val > 1000 ? 'error' : val > 500 ? 'warning' : 'success';
  if (type === 'distance') return val < 10 ? 'error' : val < 30 ? 'warning' : 'success';
  if (type === 'impact') return val > 2 ? 'error' : val > 1 ? 'warning' : 'success';
  return 'default';
}

export default function LiveSensorCard() {
  const [data, setData] = useState(null);
  const [savedData, setSavedData] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const previousEngineState = useRef(null);

  // Function to check if engine is running based on LCD display
  const isEngineRunning = (lcdDisplay) => {
    if (!lcdDisplay) return false;
    return lcdDisplay.includes('Engine: RUNNING');
  };

  // Function to save current sensor data
  const saveSensorData = () => {
    if (!data) return;

    // Create a new entry with timestamp
    const entry = {
      ...data,
      savedAt: new Date().toISOString(),
      id: data.id || Date.now() // Use existing ID or generate one
    };

    // Add to saved data array
    setSavedData(prev => {
      const newData = [...prev, entry];

      // Save to localStorage for persistence
      try {
        localStorage.setItem('safedrive_saved_data', JSON.stringify(newData));
      } catch (err) {
        console.error('Error saving to localStorage:', err);
      }

      return newData;
    });

    // Show success message
    setSnackbarMessage('Sensor data saved successfully!');
    setSnackbarOpen(true);
  };

  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      const savedDataString = localStorage.getItem('safedrive_saved_data');
      if (savedDataString) {
        const parsed = JSON.parse(savedDataString);
        setSavedData(parsed);
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getLatestSensorData(); // Use the API utility to fetch sensor data
        console.log('Received sensor data:', data);

        // Enhanced debugging
        console.log('LCD Display value:', data.lcd_display);
        console.log('Timestamp:', data.timestamp);
        console.log('Data ID:', data.id);

        // Check if this is new data
        if (data && data.id !== undefined) {
          if (!window.lastSensorId) {
            window.lastSensorId = data.id;
            console.log('First data point received, ID:', data.id);
          } else if (window.lastSensorId !== data.id) {
            console.log('New data received! Previous ID:', window.lastSensorId, 'New ID:', data.id);
            window.lastSensorId = data.id;
          } else {
            console.log('Same data as before, ID still:', data.id);
          }
        }

        // Check if engine state changed from running to stopped
        const currentEngineRunning = isEngineRunning(data.lcd_display);
        if (previousEngineState.current === true && currentEngineRunning === false) {
          console.log('Engine stopped! Saving sensor data...');
          // Save the data on engine stop
          saveSensorData();
        }
        previousEngineState.current = currentEngineRunning;

        setData(data);
      } catch (err) {
        console.error('Error fetching sensor data:', err);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 1000); // Update more frequently (every 1 second)
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card sx={{mb:2}}><CardContent>Loading live sensor data...</CardContent></Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ mb: 2, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" gap={2} mb={2}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <SensorsIcon color="primary" fontSize="large" />
            </motion.div>
            <Typography variant="h6">Live Sensor Data</Typography>

            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'flex-end', 
              ml: 'auto',
              minWidth: '160px'
            }}>
            </Box>
          </Stack>

          {/* LCD Display Simulation */}
          {data.lcd_display && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Paper 
                elevation={4} 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  backgroundColor: '#00796b', 
                  color: '#e0f2f1',
                  fontFamily: 'monospace',
                  borderRadius: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  border: '8px solid #004d40',
                  '&::before': {
                    content: '"LCD DISPLAY"',
                    position: 'absolute',
                    top: -10,
                    right: 10,
                    fontSize: '0.7rem',
                    color: '#b2dfdb',
                    transform: 'rotate(0deg)',
                    padding: '0 4px',
                  }
                }}
              >
                <Typography 
                  variant="h6" 
                  fontFamily="monospace" 
                  fontWeight="bold" 
                  sx={{ 
                    textShadow: '0 0 5px rgba(224, 242, 241, 0.7)',
                    letterSpacing: '0.5px'
                  }}
                >
                  {data.lcd_display}
                </Typography>
              </Paper>
            </motion.div>
          )}

          <Box mt={2}>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Alcohol: ${data.alcohol}`} 
                  color={statusColor(data.alcohol, 'alcohol')} 
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Vibration: ${data.vibration}`} 
                  color={statusColor(data.vibration, 'vibration')} 
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Distance: ${data.distance}`} 
                  color={statusColor(data.distance, 'distance')} 
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Seatbelt: ${data.seatbelt ? 'On' : 'Off'}`} 
                  color={data.seatbelt ? 'success':'error'} 
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Impact: ${data.impact}`} 
                  color={statusColor(data.impact, 'impact')} 
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Seatbelt: ${data.seatbelt ? "Fastened" : "Unfastened"}`} 
                  color={data.seatbelt ? "success" : "error"}
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Chip 
                  label={`Impact: ${data.impact}`} 
                  color={statusColor(data.impact, 'impact')} 
                  sx={{ fontWeight: 'bold' }}
                />
              </motion.div>
            </Stack>
          </Box>

          {/* Saved Data Summary */}
          {savedData.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="text.secondary">
                {savedData.length} data point{savedData.length !== 1 ? 's' : ''} automatically saved
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Data is automatically saved when the engine stops
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </motion.div>
  );
}
