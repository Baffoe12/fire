import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { Dangerous, Speed, LocalBar, DirectionsCar, AirlineSeatReclineNormal } from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function StatsCards() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('StatsCards: Fetching stats...');
    fetch('/api/stats')
      .then(res => {
        console.log('StatsCards: Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('StatsCards: Data received:', data);
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('StatsCards: Error fetching stats:', err);
        setError(`Failed to fetch statistics: ${err.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!stats) return <Alert severity="warning">No statistics available</Alert>;

  const cards = [
    { 
      title: 'Total Accidents', 
      value: stats.total_accidents, 
      icon: <Dangerous color="error" sx={{ width: 40, height: 40 }} />,
      color: '#f44336',
      description: 'Total number of detected accidents'
    },
    { 
      title: 'Max Impact', 
      value: stats.max_impact.toFixed(1), 
      icon: <Speed color="warning" sx={{ width: 40, height: 40 }} />,
      color: '#ff9800',
      description: 'Highest impact force detected by MPU6050'
    },
    { 
      title: 'Max Alcohol', 
      value: stats.max_alcohol.toFixed(2), 
      icon: <LocalBar color="warning" sx={{ width: 40, height: 40 }} />,
      color: '#ff9800',
      description: 'Highest alcohol level detected'
    },
    { 
      title: 'Seatbelt Violations', 
      value: stats.seatbelt_violations, 
      icon: <AirlineSeatReclineNormal color="error" sx={{ width: 40, height: 40 }} />,
      color: '#f44336',
      description: 'Number of accidents without seatbelt'
    },
    { 
      title: 'Sensor Readings', 
      value: stats.total_sensor_points, 
      icon: <DirectionsCar color="primary" sx={{ width: 40, height: 40 }} />,
      color: '#2196f3',
      description: 'Total data points collected'
    },
  ];

  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Animation variants for items
  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: i => ({
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 80,
        delay: i * 0.1,
        damping: 8
      }
    })
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Grid container spacing={3} justifyContent="center" alignItems="stretch" sx={{maxWidth: 1200, mx: 'auto'}}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <motion.div 
              custom={index}
              variants={cardVariants}
              whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.95 }}
            >
              <Card sx={{ 
                height: 200, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: 4,
                boxShadow: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '5px',
                  backgroundColor: card.color,
                }
              }}>
                <CardContent sx={{textAlign: 'center', p: 2}}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 + index * 0.1 }}
                  >
                    {card.icon}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', color: card.color }}>
                      {card.value}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {card.title}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      {card.description}
                    </Typography>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
}
