// API configuration and utility functions

// Get the API URL from environment variables or use a default
const API_URL = process.env.REACT_APP_API_URL || 'https://fire-h0u2.onrender.com';

// API endpoints
const ENDPOINTS = {
  SENSOR: `${API_URL}/api/sensor`,
  SENSOR_ALL: `${API_URL}/api/sensor/all`,
  MAP: `${API_URL}/api/map`,
  STATS: `${API_URL}/api/stats`,
  ACCIDENTS: `${API_URL}/api/accidents`
};

// Generic fetch function with error handling
async function fetchFromAPI(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// API functions
export const api = {
  // Get the latest sensor data
  getLatestSensorData: () => fetchFromAPI(ENDPOINTS.SENSOR),
  
  // Get all sensor data
  getAllSensorData: () => fetchFromAPI(ENDPOINTS.SENSOR_ALL),
  
  // Get map data (accident locations)
  getMapData: () => fetchFromAPI(ENDPOINTS.MAP),
  
  // Get statistics
  getStats: () => fetchFromAPI(ENDPOINTS.STATS),
  
  // Get accident events
  getAccidents: () => fetchFromAPI(ENDPOINTS.ACCIDENTS),
  
  // Send sensor data (from ESP32)
  sendSensorData: (data) => fetchFromAPI(ENDPOINTS.SENSOR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'safedrive_secret_key'
    },
    body: JSON.stringify(data)
  })
};

export default api;
