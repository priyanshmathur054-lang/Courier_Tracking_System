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
  const weatherCondition = response.data.weather?.[0]?.main?.toLowerCase() || "";
  const rainy =
    weatherCondition.includes("rain") ||
    weatherCondition.includes("thunderstorm");

  return {
    rainy,
    message: rainy
      ? `Rain is forecast in ${city}. Delivery may take longer.`
      : "",
    configured: true,
  };
};

module.exports = { checkRain };