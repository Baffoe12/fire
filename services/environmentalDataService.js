const axios = require('axios');

async function getWeatherData(lat, lng, timestamp) {
  try {
    // MetaWeather API requires location woeid, so first get location info by lat/lng
    const locationSearchUrl = `http://www.metaweather.com/api/location/search/?lattlong=${lat},${lng}`;
    console.log('Fetching location info from MetaWeather:', locationSearchUrl);
    const locationResponse = await axios.get(locationSearchUrl);
    if (locationResponse.status !== 200 || locationResponse.data.length === 0) {
      console.error('Failed to get location info from MetaWeather');
      return null;
    }
    const woeid = locationResponse.data[0].woeid;
    console.log('Found WOEID:', woeid);

    // Fetch weather data for the location
    const weatherUrl = `http://www.metaweather.com/api/location/${woeid}/`;
    console.log('Fetching weather data from MetaWeather:', weatherUrl);
    const weatherResponse = await axios.get(weatherUrl);
    if (weatherResponse.status === 200) {
      console.log('Weather data fetched successfully from MetaWeather:', weatherResponse.data);
      return weatherResponse.data;
    } else {
      console.error('Failed to fetch weather data from MetaWeather:', weatherResponse.status, weatherResponse.statusText);
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.error('Error fetching weather data from MetaWeather:', error.response.status, error.response.data);
    } else {
      console.error('Error fetching weather data from MetaWeather:', error.message);
    }
    return null;
  }
}

module.exports = {
  getWeatherData,
};
