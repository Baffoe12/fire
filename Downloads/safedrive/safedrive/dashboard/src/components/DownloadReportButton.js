import React from 'react';
import { Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

function downloadReport() {
  fetch('/api/accidents')
    .then(res => res.json())
    .then(data => {
      const csvHeader = 'ID,Timestamp,Alcohol,Vibration,Distance,Seatbelt,Impact,Lat,Lng\n';
      const csvRows = data.map(row => [
        row.id,
        row.timestamp ? new Date(row.timestamp).toLocaleString() : '',
        row.alcohol,
        row.vibration,
        row.distance,
        row.seatbelt ? 'Yes' : 'No',
        row.impact,
        row.lat,
        row.lng
      ].join(','));
      const csvContent = csvHeader + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'accident_report.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
}

export default function DownloadReportButton() {
  return (
    <Button variant="contained" color="primary" startIcon={<DownloadIcon />} onClick={downloadReport} sx={{ ml: 2 }}>
      Download Report
    </Button>
  );
}
