import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, Typography, Grid, Alert, Box } from '@mui/material';
import api from '../api';
import SensorGauge from './SensorGauge';
import { motion } from 'framer-motion';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import SpeedIcon from '@mui/icons-material/Speed';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const warningVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, yoyo: Infinity } }
};

export default function RealTimeSensor() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const sensorData = await api.getLatestSensorData(abortControllerRef.current.signal);
        setData(sensorData);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to fetch sensor data');
          console.error(err);
        } else {
          console.log('Fetch aborted');
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isDangerous = (data) => {
    return data.alcohol > 0.05 || 
           data.impact > 2.0 || 
           data.distance < 20 || 
           !data.seatbelt;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card sx={{ mb: 3, boxShadow: 6, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Real-Time Sensor Data
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {data ? (
            <>
              {isDangerous(data) && (
                <motion.div
                  variants={warningVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#d32f2f' }}
                >
                  <WarningAmberIcon fontSize="large" />
                  <Typography variant="h6" fontWeight="bold">
                    Warning: Dangerous conditions detected!
                  </Typography>
                </motion.div>
              )}
              <Grid container spacing={3} justifyContent="center" alignItems="center">
                <Grid item xs={12} sm={4} md={3} sx={{ textAlign: 'center' }}>
                  <LocalDrinkIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <SensorGauge 
                    value={data.alcohol} 
                    maxValue={0.1} 
                    label="Alcohol" 
                    dangerThreshold={0.05}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={3} sx={{ textAlign: 'center' }}>
                  <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <SensorGauge 
                    value={data.impact} 
                    maxValue={5} 
                    label="Impact" 
                    dangerThreshold={2.0}
                    unit="g"
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={3} sx={{ textAlign: 'center' }}>
                  <DirectionsCarIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <SensorGauge 
                    value={data.distance} 
                    maxValue={200} 
                    label="Distance" 
                    dangerThreshold={20}
                    unit="m"
                  />
                </Grid>
                <Grid item xs={12} sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    Seatbelt Status: {data.seatbelt ? 'Fastened' : 'Unfastened'}
                  </Typography>
                </Grid>
              </Grid>
            </>
          ) : (
            <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
              Loading sensor data...
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
