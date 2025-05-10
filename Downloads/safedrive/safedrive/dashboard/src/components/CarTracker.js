import React, { useEffect, useState } from 'react';
import { Paper, Box, Typography, LinearProgress, Fade } from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

export default function CarTracker() {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/car/position')
      .then(res => res.json())
      .then(data => { setPosition(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Fade in timeout={700}>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2, minWidth: 260 }} elevation={3}>
        <DirectionsCarIcon color="primary" sx={{ fontSize: 40 }} />
        {loading ? (
          <Box width={120}><LinearProgress /></Box>
        ) : position ? (
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">Car Position</Typography>
            <Typography variant="body2">Lat: {position.lat}</Typography>
            <Typography variant="body2">Lng: {position.lng}</Typography>
            <Typography variant="body2">Speed: {position.speed} km/h</Typography>
          </Box>
        ) : (
          <Typography color="error">No car data</Typography>
        )}
      </Paper>
    </Fade>
  );
}
