const axios = require('axios');

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || 'your_openweathermap_api_key';
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/2.5';

async function getWeatherData(lat, lng, timestamp) {
  try {
    // OpenWeatherMap One Call API requires unix timestamp in seconds
    const dt = Math.floor(new Date(timestamp).getTime() / 1000);

    // Fetch historical weather data for given location and time
    const url = OPENWEATHERMAP_BASE_URL + '/onecall/timemachine?lat=' + lat + '&lon=' + lng + '&dt=' + dt + '&appid=' + OPENWEATHERMAP_API_KEY + '&units=metric';

    const response = await axios.get(url);
    if (response.status === 200) {
      return response.data;
    } else {
      console.error('Failed to fetch weather data:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    return null;
  }
}

module.exports = {
  getWeatherData,
};
