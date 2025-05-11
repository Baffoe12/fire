  import React, { useEffect, useState } from 'react';
import { Button, Box } from '@mui/material';

// Real backend connection status
function useConnectionStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let timeout;
    async function checkConnection() {
      try {
        const res = await fetch('https://fire-h0u2.onrender.com/api/health', { cache: 'no-store' });
        if (res.ok) setConnected(true);
        else setConnected(false);
      } catch {
        setConnected(false);
      }
      timeout = setTimeout(checkConnection, 5000); // ping every 5s
    }
    checkConnection();
    return () => clearTimeout(timeout);
  }, []);
  return connected;
}

export default function ConnectionStatusButton() {
  const connected = useConnectionStatus();
  return (
    <Button
      variant="contained"
      sx={{
        minWidth: 54,
        minHeight: 54,
        borderRadius: '50%',
        boxShadow: connected
          ? '0 4px 16px #43a04799, 0 1.5px 4px #3333'
          : '0 4px 16px #d32f2f99, 0 1.5px 4px #3333',
        background: connected
          ? 'linear-gradient(145deg, #43e97b 0%, #38f9d7 100%)'
          : 'linear-gradient(145deg, #ff5858 0%, #f857a6 100%)',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        transition: 'all 0.3s cubic-bezier(.25,1.25,.5,1.1)',
        border: connected ? '2.5px solid #43a047' : '2.5px solid #d32f2f',
        textShadow: '0 2px 8px #0007',
        outline: 'none',
        cursor: 'pointer',
        '&:active': {
          boxShadow: connected
            ? '0 2px 8px #43a04777'
            : '0 2px 8px #d32f2f77',
        },
        mx: 2,
      }}
      disableElevation
      tabIndex={-1}
      aria-label={connected ? 'System Connected' : 'System Not Connected'}
    >
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: connected ? '#43a047' : '#d32f2f',
          boxShadow: connected
            ? '0 0 12px 2px #43e97b88'
            : '0 0 12px 2px #ff585888',
          display: 'inline-block',
          mr: 1.5,
          border: '2px solid #fff',
        }}
      />
      {connected ? 'Connected' : 'Disconnected'}
    </Button>
  );
}
