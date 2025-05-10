import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

export default function SensorGauge({ value, maxValue, label, dangerThreshold, unit }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const isDanger = value >= dangerThreshold;

  return (
    <Box sx={{ width: 120, textAlign: 'center' }}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <LinearProgress 
        variant="determinate" 
        value={percentage} 
        sx={{
          height: 12,
          borderRadius: 6,
          backgroundColor: '#ddd',
          '& .MuiLinearProgress-bar': {
            backgroundColor: isDanger ? '#e53935' : '#1abc9c',
            transition: 'background-color 0.3s ease',
          },
        }}
      />
      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 'bold', color: isDanger ? '#e53935' : 'inherit' }}>
        {value}{unit ? ` ${unit}` : ''}
      </Typography>
    </Box>
  );
}
