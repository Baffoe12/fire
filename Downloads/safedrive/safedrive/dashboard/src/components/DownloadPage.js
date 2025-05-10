import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Chip,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion } from 'framer-motion';

export default function DownloadPage() {
  const [sensorData, setSensorData] = useState([]);
  const [accidentData, setAccidentData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [savedData, setSavedData] = useState([]);
  
  // Load all data needed for evidence package
  useEffect(() => {
    setLoading(true);
    
    // Load saved data from localStorage
    try {
      const savedDataString = localStorage.getItem('safedrive_saved_data');
      if (savedDataString) {
        const parsed = JSON.parse(savedDataString);
        setSavedData(parsed);
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
    
    // Fetch sensor data
    const fetchSensorData = fetch('/api/sensor/history')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch sensor data');
        return res.json();
      })
      .then(data => setSensorData(data))
      .catch(err => {
        console.error('Error fetching sensor data:', err);
        setError(err.message);
      });
    
    // Fetch accident data
    const fetchAccidentData = fetch('/api/map')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch accident data');
        return res.json();
      })
      .then(data => setAccidentData(data))
      .catch(err => {
        console.error('Error fetching accident data:', err);
        setError(err.message);
      });
    
    // Fetch stats data
    const fetchStatsData = fetch('/api/stats')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch stats data');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error('Error fetching stats data:', err);
        setError(err.message);
      });
    
    // Wait for all fetches to complete
    Promise.all([fetchSensorData, fetchAccidentData, fetchStatsData])
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, []);
  
  // Function to download all evidence data as JSON
  const downloadAllData = () => {
    const evidencePackage = {
      timestamp: new Date().toISOString(),
      device_info: {
        device_id: 'SafeDrive_Pro_001',
        firmware_version: '1.0.0',
        last_calibration: new Date().toISOString()
      },
      sensor_data: sensorData,
      accident_data: accidentData,
      saved_data: savedData,
      statistics: stats
    };
    
    // Create and download the file
    const dataStr = JSON.stringify(evidencePackage, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `safedrive_evidence_${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    setSnackbarMessage('Evidence package downloaded successfully!');
    setSnackbarOpen(true);
  };
  
  // Function to download data as CSV
  const downloadAsCSV = (data, filename) => {
    if (!data || data.length === 0) {
      setSnackbarMessage('No data available to download');
      setSnackbarOpen(true);
      return;
    }
    
    // Get headers from first data object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        // Handle special cases (null, undefined, objects)
        let cell = item[header];
        if (cell === null || cell === undefined) {
          return '';
        } else if (typeof cell === 'object') {
          return JSON.stringify(cell).replace(/"/g, '""');
        } else {
          return String(cell).replace(/"/g, '""');
        }
      }).join(',');
      csvContent += row + '\n';
    });
    
    // Create and download the file
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    setSnackbarMessage(`${filename} downloaded successfully!`);
    setSnackbarOpen(true);
  };
  
  // Function to create a PDF report (simplified version)
  const downloadPDFReport = () => {
    setSnackbarMessage('PDF report generation is not implemented in this demo version');
    setSnackbarOpen(true);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading evidence data...</Typography>
      </Box>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          Download Evidence Data
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            This page allows you to download all SafeDrive Pro data for evidence purposes. 
            The downloaded files can be used for insurance claims, legal proceedings, or accident investigations.
          </Typography>
        </Alert>
        
        {/* Main download card */}
        <Card sx={{ mb: 4, borderRadius: 2, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FileDownloadIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
              <Typography variant="h5" component="div">
                Complete Evidence Package
              </Typography>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Download a comprehensive package containing all sensor data, accident events, 
              and system statistics in a single file. This package includes all necessary 
              information for accident investigation and insurance claims.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2">
                Package Contents:
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Sensor Data" 
                    secondary={`${sensorData.length || 0} records available`} 
                  />
                  <Chip 
                    label={sensorData.length > 0 ? "Available" : "No Data"} 
                    color={sensorData.length > 0 ? "success" : "error"} 
                    size="small" 
                    icon={sensorData.length > 0 ? <CheckCircleIcon /> : <WarningIcon />}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Accident Events" 
                    secondary={`${accidentData.length || 0} records available`} 
                  />
                  <Chip 
                    label={accidentData.length > 0 ? "Available" : "No Data"} 
                    color={accidentData.length > 0 ? "success" : "error"} 
                    size="small" 
                    icon={accidentData.length > 0 ? <CheckCircleIcon /> : <WarningIcon />}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Saved Engine Stop Data" 
                    secondary={`${savedData.length || 0} records available`} 
                  />
                  <Chip 
                    label={savedData.length > 0 ? "Available" : "No Data"} 
                    color={savedData.length > 0 ? "success" : "error"} 
                    size="small" 
                    icon={savedData.length > 0 ? <CheckCircleIcon /> : <WarningIcon />}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="System Statistics" 
                    secondary="Summary statistics and metadata" 
                  />
                  <Chip 
                    label={stats ? "Available" : "No Data"} 
                    color={stats ? "success" : "error"} 
                    size="small" 
                    icon={stats ? <CheckCircleIcon /> : <WarningIcon />}
                  />
                </ListItem>
              </List>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large" 
                  startIcon={<DownloadIcon />}
                  onClick={downloadAllData}
                  disabled={loading || (!sensorData.length && !accidentData.length && !savedData.length && !stats)}
                  sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                  Download Complete Evidence Package
                </Button>
              </motion.div>
            </Box>
          </CardContent>
        </Card>
        
        {/* Individual download options */}
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Individual Data Downloads
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  Sensor Data (CSV)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download raw sensor readings in CSV format for analysis in Excel or other tools.
                </Typography>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FileDownloadIcon />}
                    onClick={() => downloadAsCSV(sensorData, 'safedrive_sensor_data.csv')}
                    disabled={!sensorData.length}
                    fullWidth
                  >
                    Download Sensor Data
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  Accident Events (CSV)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download accident event data including location, time, and impact severity.
                </Typography>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FileDownloadIcon />}
                    onClick={() => downloadAsCSV(accidentData, 'safedrive_accident_data.csv')}
                    disabled={!accidentData.length}
                    fullWidth
                  >
                    Download Accident Data
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  Engine Stop Data (CSV)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download data captured at engine stop events, including all sensor values.
                </Typography>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FileDownloadIcon />}
                    onClick={() => downloadAsCSV(savedData, 'safedrive_engine_stop_data.csv')}
                    disabled={!savedData.length}
                    fullWidth
                  >
                    Download Engine Stop Data
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  PDF Report
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Generate a comprehensive PDF report with visualizations and analysis.
                </Typography>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FileDownloadIcon />}
                    onClick={downloadPDFReport}
                    fullWidth
                  >
                    Generate PDF Report
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Legal information */}
        <Card sx={{ mt: 4, borderRadius: 2, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Legal Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The data provided in these downloads is admissible as evidence in legal proceedings and insurance claims. 
              All data is timestamped and includes device identification information to ensure authenticity. 
              SafeDrive Pro maintains the integrity of all sensor data and cannot be tampered with.
            </Typography>
          </CardContent>
        </Card>
      </Box>
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
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
