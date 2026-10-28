const axios = require("axios");

const checkRain = async (city) => {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return { rainy: false, message: "", configured: false };
  }

  const response = await axios.get(
    "https://api.openweathermap.org/data/2.5/weather",
    {
      params: { q: city, units: "metric", appid: apiKey },
      timeout: 5000,
    },
  );
  const weather = response.data.weather?.[0];
  const weatherCondition = weather?.main?.toLowerCase() || "";
  const rainy =
    weatherCondition.includes("rain") ||
    weatherCondition.includes("thunderstorm");

  return {
    city: response.data.name || city,
    condition: weather?.description || weather?.main || "Unknown",
    temperatureC: response.data.main?.temp ?? null,
    rainy,
    message: rainy
      ? `Rain is currently reported in ${response.data.name || city}. Delivery may take longer.`
      : "",
    configured: true,
  };
};

module.exports = { checkRain };