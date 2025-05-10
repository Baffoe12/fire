import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip } from '@mui/material';
import { LocationOn, LocalBar, AirlineSeatReclineNormal, Speed, WifiCalling3 } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccidentLog() {
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('AccidentLog: Fetching accident data...');
    fetch('/api/accidents')
      .then(res => {
        console.log('AccidentLog: Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('AccidentLog: Data received:', data);
        setAccidents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('AccidentLog: Error fetching accidents:', err);
        setError(`Failed to fetch accident log: ${err.message}`);
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

  if (!accidents || accidents.length === 0) return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Alert severity="info">No accident data available</Alert>
    </motion.div>
  );

  // Helper function to determine severity based on impact value
  const getSeverity = (impact) => {
    if (impact > 8) return { level: 'High', color: '#f44336' };
    if (impact > 5) return { level: 'Medium', color: '#ff9800' };
    return { level: 'Low', color: '#4caf50' };
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
          <Typography variant="h5" mb={2}>Accident Event Log</Typography>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell width="5%"><Typography fontWeight="bold">ID</Typography></TableCell>
                    <TableCell width="15%"><Typography fontWeight="bold">Timestamp</Typography></TableCell>
                    <TableCell width="15%"><Typography fontWeight="bold">Severity</Typography></TableCell>
                    <TableCell width="15%"><Typography fontWeight="bold">Factors</Typography></TableCell>
                    <TableCell width="15%"><Typography fontWeight="bold">Location</Typography></TableCell>
                    <TableCell width="15%"><Typography fontWeight="bold">Emergency Call</Typography></TableCell>
                    <TableCell width="20%"><Typography fontWeight="bold">Details</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {accidents.map((accident, index) => {
                      const severity = getSeverity(accident.impact);
                      return (
                        <motion.tr
                          key={accident.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          component={TableRow}
                          sx={{
                            '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                            '&:hover': { backgroundColor: '#f0f7ff' },
                          }}
                        >
                          <TableCell>
                            <Typography fontWeight="medium">{accident.id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography>{new Date(accident.timestamp).toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={severity.level} 
                              sx={{ 
                                backgroundColor: severity.color, 
                                color: 'white',
                                fontWeight: 'bold'
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {accident.alcohol > 0.05 && (
                                <Tooltip title={`Alcohol: ${accident.alcohol.toFixed(2)}`}>
                                  <IconButton size="small" color="warning">
                                    <LocalBar />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {accident.seatbelt === 0 && (
                                <Tooltip title="Seatbelt not worn">
                                  <IconButton size="small" color="error">
                                    <AirlineSeatReclineNormal />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {accident.impact > 5 && (
                                <Tooltip title={`Impact: ${accident.impact.toFixed(1)}`}>
                                  <IconButton size="small" color="error">
                                    <Speed />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {accident.lat && accident.lng ? (
                              <Tooltip title={`${accident.lat.toFixed(4)}, ${accident.lng.toFixed(4)}`}>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  component="a"
                                  href={`https://www.google.com/maps/search/?api=1&query=${accident.lat},${accident.lng}`}
                                  target="_blank"
                                >
                                  <LocationOn />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">N/A</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {accident.emergency_call ? (
                              <Tooltip title="Emergency call placed">
                                <Chip 
                                  icon={<WifiCalling3 />} 
                                  label="Called" 
                                  color="success" 
                                  size="small" 
                                  variant="outlined" 
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">None</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {accident.vibration > 5 && 'High vibration. '}
                              {accident.distance < 10 && 'Proximity warning. '}
                              {accident.alcohol > 0.05 && 'Alcohol detected. '}
                              {accident.impact > 8 && 'Severe impact detected. '}
                              {accident.seatbelt === 0 && 'Seatbelt not worn. '}
                              {accident.lcd_display && `LCD: "${accident.lcd_display}"`}
                            </Typography>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Note:</strong> The accident log displays events detected by the SafeDrive Pro system's combined sensor detection logic. 
            When the system detects dangerous conditions (high impact, alcohol, or multiple sensor triggers), it logs the event, 
            disables the engine, and can place emergency calls to preset numbers.
          </Typography>
        </motion.div>
      </Box>
    </motion.div>
  );
}
