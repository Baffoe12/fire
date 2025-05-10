import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Paper, Button, Snackbar, Alert } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

// Custom car icon for the map
const carIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/color/48/car--v1.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// Custom accident icon for the map
const accidentIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/color/48/high-priority.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

function CarMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  if (!position) return null;
  return (
    <Marker position={position} icon={carIcon}>
      <Popup>
        <strong>Car Live Position</strong><br />
        Lat: {position[0]}<br />
        Lng: {position[1]}
      </Popup>
    </Marker>
  );
}

function useReverseGeocode(lat, lng) {
  const [address, setAddress] = useState('');
  useEffect(() => {
    if (lat && lng) {
      setAddress('Loading address...');
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => setAddress(data.display_name || 'Address not found'))
        .catch(() => setAddress('Address not found'));
    }
  }, [lat, lng]);
  return address;
}

function MapPage() {
  const [locations, setLocations] = useState([]);
  const [carPos, setCarPos] = useState(null);
  const [carPath, setCarPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carPathRef = useRef([]);
  const [addresses, setAddresses] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    console.log('MapPage: Fetching accident locations...');
    fetch('/api/map')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => { 
        console.log('MapPage: Received accident locations:', data);
        setLocations(data); 
        setLoading(false); 
      })
      .catch(err => { 
        console.error('MapPage: Error fetching accident locations:', err);
        setError('Failed to fetch accident locations'); 
        setLoading(false); 
      });
  }, []);

  useEffect(() => {
    let interval = setInterval(() => {
      fetch('/api/car/position')
        .then(res => res.json())
        .then(data => {
          const pos = [data.lat, data.lng];
          setCarPos(pos);
          if (!carPathRef.current.length ||
              carPathRef.current[carPathRef.current.length-1][0] !== pos[0] ||
              carPathRef.current[carPathRef.current.length-1][1] !== pos[1]) {
            carPathRef.current = [...carPathRef.current, pos];
            setCarPath([...carPathRef.current]);
          }
        });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAddresses = async () => {
      const promises = locations.map(loc => {
        return fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.lat}&lon=${loc.lng}`)
          .then(res => res.json())
          .then(data => ({ id: loc.id, address: data.display_name || 'Address not found' }));
      });
      const addresses = await Promise.all(promises);
      const addressesObj = addresses.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.address }), {});
      setAddresses(addressesObj);
    };
    if (locations.length > 0) {
      fetchAddresses();
    }
  }, [locations]);

  const sendEmergencyAlert = () => {
    if (!navigator.geolocation) {
      setSnackbarMsg('Geolocation is not supported by your browser.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const emergencyEmail = localStorage.getItem('emergencyEmail');
        if (!emergencyEmail) {
          setSnackbarMsg('No emergency contact email saved. Please save it first.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
        fetch('/api/emergency-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emergencyEmail, latitude, longitude }),
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to send emergency alert');
            return res.json();
          })
          .then(() => {
            setSnackbarMsg('Emergency alert sent successfully.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
          })
          .catch(() => {
            setSnackbarMsg('Failed to send emergency alert.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
          });
      },
      () => {
        setSnackbarMsg('Unable to retrieve your location.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    );
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="600px">
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
      <Typography color="error">{error}</Typography>
    </motion.div>
  );

  const center = carPos || (locations.length ? [locations[0].lat, locations[0].lng] : [5.6545, -0.1869]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Box>
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h5" mb={2}>
            Accident Locations Map
            {locations.length > 0 && (
              <Box component="span" sx={{ ml: 2, fontSize: '1rem', color: 'text.secondary' }}>
                {locations.length} accident{locations.length !== 1 ? 's' : ''} detected
              </Box>
            )}
          </Typography>
          <Button variant="contained" color="error" onClick={sendEmergencyAlert} sx={{ height: 40 }}>
            Send Emergency Alert with Location
          </Button>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 80, delay: 0.3 }}
        >
          <Paper sx={{ height: 600, mb: 2, overflow: 'hidden', borderRadius: 2, boxShadow: 3 }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {locations.map((loc, i) => {
                return (
                  <Marker key={i} position={[loc.lat, loc.lng]} icon={accidentIcon}>
                    <Popup>
                      <Box sx={{ fontFamily: 'Arial', fontSize: '14px' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="error.main">Accident #{loc.id}</Typography>
                        <Box sx={{ mt: 1 }}>
                          <strong>Time:</strong> {new Date(loc.timestamp).toLocaleString()}<br />
                          <strong>Location:</strong> {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}<br />
                          <strong>Address:</strong> <span style={{color:'#1976d2'}}>{addresses[loc.id] || 'Loading address...'}</span>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1976d2', textDecoration: 'none' }}
                          >
                            View on Google Maps
                          </a>
                        </Box>
                      </Box>
                    </Popup>
                  </Marker>
                );
              })}
              {carPath.length > 1 && (
                <Polyline 
                  positions={carPath} 
                  color="#2196f3" 
                  weight={3} 
                  opacity={0.7} 
                  dashArray="5, 10"
                />
              )}
              <CarMarker position={carPos} />
            </MapContainer>
          </Paper>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>Note:</strong> The map shows accident locations detected by the SafeDrive Pro system. 
            When the MPU6050 detects strong impact or multiple sensors trigger simultaneously, 
            the system logs the accident location and can automatically place emergency calls.
          </Typography>
        </motion.div>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
}

export default MapPage;
