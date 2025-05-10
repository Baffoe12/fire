import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, Box
} from '@mui/material';

// Example data, replace with real API data as needed
const accidentImpacts = [
  {
    id: 1,
    type: 'Severe Collision',
    time: '2025-04-21 14:22',
    impactLevel: 'High',
    summary: 'Front-end collision at 65 km/h. Airbags deployed.',
    details: 'A severe front-end collision was detected by the MPU6050 and vibration sensors. Emergency call initiated. Driver and passenger airbags deployed. Vehicle immobilized. Emergency services notified. No fatalities reported.'
  },
  {
    id: 2,
    type: 'Minor Bump',
    time: '2025-04-20 09:10',
    impactLevel: 'Low',
    summary: 'Low-speed bump detected in parking lot.',
    details: 'Minor impact detected by vibration sensor. No emergency action required. System logged the event for record-keeping. No injuries or vehicle damage.'
  },
  {
    id: 3,
    type: 'Side Impact',
    time: '2025-04-18 17:45',
    impactLevel: 'Medium',
    summary: 'Side collision at intersection. Engine disabled.',
    details: 'Side impact detected by ultrasonic and vibration sensors. Engine automatically disabled. Emergency SMS sent to family. No major injuries, but vehicle towed for inspection.'
  },
  {
    id: 4,
    type: 'Rear-end Collision',
    time: '2025-04-17 12:30',
    impactLevel: 'Medium',
    summary: 'Rear-end collision at traffic light.',
    details: 'Rear-end collision detected by vibration sensors. Minor injuries reported. Vehicle towed for repairs.'
  }
];

export default function AccidentImpactTable() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleRowClick = (row) => {
    setSelected(row);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  // Limit to 3 most recent accident impacts
  const displayedAccidents = accidentImpacts.slice(0, 3);

  return (
    <Box my={5}>
      <Typography variant="h5" fontWeight="bold" mb={2} color="#000">
        Accident Impact Log
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 3, background: 'linear-gradient(135deg,#f5f5f5 0%,#e0e0e0 100%)', boxShadow: 8 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#000', fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: 'bold' }}>Time</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: 'bold' }}>Impact Level</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: 'bold' }}>Summary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedAccidents.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ cursor: 'pointer', ':hover': { background: 'rgba(229,57,53,0.09)' } }}
                onClick={() => handleRowClick(row)}
              >
                <TableCell sx={{ color: '#000' }}>{row.type}</TableCell>
                <TableCell sx={{ color: '#000' }}>{row.time}</TableCell>
                <TableCell sx={{ color: row.impactLevel === 'High' ? '#e53935' : row.impactLevel === 'Medium' ? '#ffb300' : '#43a047', fontWeight: 'bold' }}>{row.impactLevel}</TableCell>
                <TableCell sx={{ color: '#000' }}>{row.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for report detail */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Accident Report Detail</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {selected.type} ({selected.impactLevel})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Time: {selected.time}
              </Typography>
              <Typography variant="body1" mt={2}>
                {selected.details}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
