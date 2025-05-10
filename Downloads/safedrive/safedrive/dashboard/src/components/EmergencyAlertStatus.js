import React, { useState, useEffect } from 'react';
import { Alert, Snackbar, Button, TextField, Box, Typography } from '@mui/material';

export default function EmergencyAlertStatus() {
  const [alertActive, setAlertActive] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [emergencyEmail, setEmergencyEmail] = useState(() => {
    return localStorage.getItem('emergencyEmail') || '';
  });
  const [location, setLocation] = useState(null);
  const [sending, setSending] = useState(false);

  // Simulate alert status polling (replace with real API call if available)
  useEffect(() => {
    const interval = setInterval(() => {
      // TODO: fetch alert status from backend if implemented
      // For demo, randomly activate alert
      // setAlertActive(Math.random() < 0.1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (alertActive) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            console.error('Geolocation error:', err);
            setLocation(null);
          }
        );
      } else {
        setLocation(null);
      }
    }
  }, [alertActive]);

  const handleEmailChange = (e) => {
    setEmergencyEmail(e.target.value);
  };

  const saveEmail = () => {
    localStorage.setItem('emergencyEmail', emergencyEmail);
    setSnackbarOpen(true);
  };

  const sendAlertWithLocation = () => {
    if (!emergencyEmail) {
      alert('Please provide an emergency contact email.');
      return;
    }
    if (!location) {
      alert('Location not available.');
      return;
    }
    setSending(true);
    // TODO: Replace with real API call to send email with location
    setTimeout(() => {
      setSending(false);
      alert('Emergency alert sent to ' + emergencyEmail + ' with location: ' + location.latitude + ', ' + location.longitude);
    }, 1500);
  };

  return (
    <Box sx={{ p: 2, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Emergency Alert Status
      </Typography>
      <Alert severity={alertActive ? 'error' : 'success'} sx={{ mb: 2 }}>
        {alertActive ? 'Emergency Alert Active!' : 'No active alerts'}
      </Alert>
      <TextField
        label="Emergency Contact Email"
        value={emergencyEmail}
        onChange={handleEmailChange}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={saveEmail} fullWidth sx={{ mb: 2 }}>
        Save Contact Email
      </Button>
      {alertActive && (
        <Button
          variant="contained"
          color="error"
          onClick={sendAlertWithLocation}
          fullWidth
          disabled={sending}
          sx={{ mb: 2 }}
        >
          {sending ? 'Sending Alert...' : 'Send Emergency Alert with Location'}
        </Button>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message="Emergency contact email saved"
      />
    </Box>
  );
}
