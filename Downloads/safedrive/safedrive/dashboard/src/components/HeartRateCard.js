import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { motion } from 'framer-motion';
import api from '../api'; // Import your API service

const HeartRateCard = () => {
  const [heartRate, setHeartRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const fetchHeartRate = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      try {
        setLoading(true);
        setError(null);
        const data = await api.getLatestSensorData(abortControllerRef.current.signal); // Pass abort signal
        if (data && data.heart_rate !== undefined) {
          setHeartRate(data.heart_rate);
        } else {
          throw new Error('No pulse data available');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // Fetch aborted, do not set error
          console.log('Fetch aborted');
        } else {
          console.error('Error fetching heart rate:', err);
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    // Poll heart rate data every second
    const interval = setInterval(fetchHeartRate, 1000);
    fetchHeartRate(); // Initial fetch

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Card sx={{ 
      mb: 2, 
      borderRadius: 2, 
      boxShadow: 3,
      transition: 'transform 0.3s ease',
      '&:hover': {
        transform: 'scale(1.02)',
        boxShadow: 6
      }
    }}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          gap: 1 
        }}>
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <FavoriteIcon 
              color="error" 
              sx={{ fontSize: 32 }}
            />
          </motion.div>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}
          >
            Heart Rate Monitor
          </Typography>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 100 }}>
            <CircularProgress size={40} sx={{ color: 'error.main' }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography 
              color="error" 
              variant="body1"
              sx={{ fontWeight: 'bold' }}
            >
              {error}
            </Typography>
          </Box>
        ) : (
          <Box textAlign="center" sx={{ py: 2 }}>
            <Typography 
              variant="h3" 
              color="error"
              sx={{ 
                fontSize: '4rem',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {heartRate || '--'}
              <Typography 
                variant="h6" 
                component="span" 
                color="textSecondary"
                sx={{ 
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              >
                {' '}BPM
              </Typography>
            </Typography>
            <Typography 
              variant="body1" 
              color="textSecondary" 
              sx={{ 
                mt: 1,
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}
            >
              {heartRate ? 
                (heartRate < 60 ? 'Low' : heartRate > 100 ? 'High' : 'Normal') : 
                '--'
              }{' '}
              Heart Rate
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default HeartRateCard;
