import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Grid } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export default function SensorHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('SensorHistory: Fetching sensor history data...');
    fetch('/api/sensor/history')
      .then(res => {
        console.log('SensorHistory: Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('SensorHistory: Data received:', data);
        // Format the data for the chart
        const formattedData = data.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp).toLocaleTimeString(),
        }));
        setData(formattedData);
        setLoading(false);
      })
      .catch(err => {
        console.error('SensorHistory: Error fetching sensor history:', err);
        setError(`Failed to fetch sensor history: ${err.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CircularProgress />
      </motion.div>
    </Box>
  );

  if (error) return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Alert severity="error">{error}</Alert>
    </motion.div>
  );

  if (!data || data.length === 0) return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Alert severity="info">No sensor history data available</Alert>
    </motion.div>
  );

  // Define chart colors
  const chartColors = {
    alcohol: '#ff9800',  // Orange for alcohol readings
    vibration: '#f44336', // Red for vibration (potential accidents)
    distance: '#2196f3',  // Blue for distance readings
    impact: '#e91e63',    // Pink for impact readings
    seatbelt: '#4caf50'    // Green for seatbelt status
  };

  // Define sensor descriptions
  const sensorDescriptions = {
    alcohol: 'Alcohol sensor readings (higher values indicate potential intoxication)',
    vibration: 'Vibration sensor readings (spikes indicate potential accidents)',
    distance: 'Ultrasonic distance sensor readings (lower values indicate closer objects)',
    impact: 'MPU6050 impact/acceleration readings (spikes indicate potential accidents)',
    seatbelt: 'Seatbelt sensor status (1 = buckled, 0 = unbuckled)'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Box sx={{ mb: 4 }}>
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <Typography variant="h5" mb={2}>Sensor Data History</Typography>
        </motion.div>

        <Grid container spacing={3}>
          {Object.entries(sensorDescriptions).map(([sensor, description], index) => (
            <Grid item xs={12} key={sensor}>
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 70, 
                  damping: 10, 
                  delay: index * 0.1 + 0.2 
                }}
              >
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    mb: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '5px',
                      height: '100%',
                      backgroundColor: chartColors[sensor],
                    }
                  }}
                >
                  <Typography 
                    variant="h6" 
                    mb={1} 
                    sx={{ 
                      color: chartColors[sensor],
                      fontWeight: 'bold',
                      textTransform: 'capitalize'
                    }}
                  >
                    {sensor} Readings
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {description}
                  </Typography>
                  
                  <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis 
                          dataKey="timestamp" 
                          tick={{ fontSize: 12 }} 
                          label={{ value: 'Time', position: 'insideBottomRight', offset: -5 }} 
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }} 
                          label={{ value: sensor === 'seatbelt' ? 'Status' : 'Value', angle: -90, position: 'insideLeft' }} 
                        />
                        <Tooltip 
                          formatter={(value) => [value, sensor === 'seatbelt' ? (value === 1 ? 'Buckled' : 'Unbuckled') : sensor]}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey={sensor}
                          stroke={chartColors[sensor]}
                          strokeWidth={2}
                          dot={{ r: 4, strokeWidth: 1 }}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                          animationDuration={1500}
                          animationEasing="ease-in-out"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Note:</strong> This dashboard displays real-time sensor data from the SafeDrive Pro system. 
            The system uses combined sensor detection logic to identify potential accidents when multiple sensors trigger simultaneously. 
            When dangerous conditions are detected, the system can automatically disable the engine, slow down the vehicle, and place emergency calls.
          </Typography>
        </motion.div>
      </Box>
    </motion.div>
  );
}
