import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningIcon from '@mui/icons-material/Warning';
import SensorsIcon from '@mui/icons-material/Sensors';

const statsInfo = [
  { label: 'Total Accidents', color: '#e53935', icon: <LocalHospitalIcon fontSize="large" /> , key: 'total_accidents' },
  { label: 'Max Alcohol Level', color: '#ff9800', icon: <LocalDrinkIcon fontSize="large" /> , key: 'max_alcohol', isFloat: true },
  { label: 'Average Alcohol Level', color: '#ff9800', icon: <LocalDrinkIcon fontSize="large" /> , key: 'avg_alcohol', isFloat: true },
  { label: 'Max Impact Force', color: '#f44336', icon: <SpeedIcon fontSize="large" /> , key: 'max_impact', isFloat: true },
  { label: 'Seatbelt Violations', color: '#e53935', icon: <WarningIcon fontSize="large" /> , key: 'seatbelt_violations' },
  { label: 'Total Sensor Data Points', color: '#2196f3', icon: <SensorsIcon fontSize="large" /> , key: 'total_sensor_points' },
];

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(`Failed to fetch statistics: ${err.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!stats) return <Alert severity="warning">No statistics available</Alert>;

  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  // Animation variants for items
  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.9 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom component={motion.h4}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100 }}
          sx={{ mb: 3 }}
        >
          System Statistics
        </Typography>
        
        <Grid container spacing={3}>
          {statsInfo.map(({ label, color, icon, key, isFloat }) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <motion.div variants={itemVariants}>
                <Paper elevation={4} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, background: 'linear-gradient(145deg, #f0f4ff 0%, #e6f0ff 100%)' }}>
                  <Box sx={{ color, display: 'flex', alignItems: 'center' }}>
                    {icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{label}</Typography>
                    <Typography variant="h5" sx={{ color, fontWeight: 'bold' }}>
                      {isFloat ? stats[key].toFixed(2) : stats[key]}
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    </motion.div>
  );
}
