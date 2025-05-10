import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Divider, Button, Dialog } from '@mui/material';
import { CheckCircle, WarningAmber, Speed, DisplaySettings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import EmergencyAlertStatus from './EmergencyAlertStatus';

export default function StatusBar({ sensorData }) {
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const navigate = useNavigate();

  const isDangerous = sensorData && (
    sensorData.alcohol > 0.05 ||
    sensorData.impact > 2.0 ||
    sensorData.distance < 20 ||
    !sensorData.seatbelt
  );

  const handleEmergencyAlertClick = () => {
    setEmergencyDialogOpen(true);
  };

  const handleEmergencyDialogClose = () => {
    setEmergencyDialogOpen(false);
  };

  const handleLiveLocationClick = () => {
    navigate('/map');
  };

  return (
    <>
      <AppBar position="fixed" color="default" sx={{ top: 'auto', bottom: 0, bgcolor: '#f5f5f5', boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}>
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {isDangerous ? (
              <WarningAmber color="error" fontSize="large" />
            ) : (
              <CheckCircle color="success" fontSize="large" />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              System Status: {isDangerous ? 'Warning' : 'Normal'}
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DisplaySettings color="primary" />
              <Typography variant="body2" sx={{ minWidth: 150 }}>
                LCD: {sensorData && sensorData.lcd_display ? sensorData.lcd_display : 'No Display Data'}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip 
              label={'Alcohol: ' + (sensorData && sensorData.alcohol ? sensorData.alcohol.toFixed(2) : '0.00')}
              color={sensorData && sensorData.alcohol > 0.05 ? 'error' : 'default'}
              variant="outlined"
              size="small"
            />
            <Chip 
              icon={<Speed />}
              label={'Distance: ' + (sensorData && sensorData.distance ? sensorData.distance : '0') + ' m'}
              color={sensorData && sensorData.distance < 20 ? 'error' : 'default'}
              variant="outlined"
              size="small"
            />
            <Chip 
              label={'Impact: ' + (sensorData && sensorData.impact ? sensorData.impact : '0') + ' g'}
              color={sensorData && sensorData.impact > 2.0 ? 'error' : 'default'}
              variant="outlined"
              size="small"
            />
            <Chip 
              label={'Seatbelt: ' + (sensorData && sensorData.seatbelt ? 'Fastened' : 'Unfastened')}
              color={sensorData && sensorData.seatbelt ? 'success' : 'error'}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={handleEmergencyAlertClick}
              sx={{ ml: 2, fontWeight: 'bold', textTransform: 'none' }}
            >
              Emergency Alerts
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleLiveLocationClick}
              sx={{ ml: 1, fontWeight: 'bold', textTransform: 'none' }}
            >
              Live Location Sharing
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Dialog open={emergencyDialogOpen} onClose={handleEmergencyDialogClose}>
        <EmergencyAlertStatus />
      </Dialog>
    </>
  );
}
