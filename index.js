const crypto = require('crypto');
const axios = require('axios');
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
    const apiKey = process.env.API_KEY;
    const apiSecret = process.env.API_SECRET;
    const stationId = process.env.STATION_ID;

    const t = Math.floor(Date.now() / 1000).toString();

    const parameters = [
        ['api-key', apiKey],
        ['station-id', stationId],
        ['t', t]
    ].sort();

    const message = parameters.map(pair => pair.join('')).join('');

    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(message);
    const signature = hmac.digest('hex');

    const weatherStationUrl = `https://api.weatherlink.com/v2/current/${stationId}?api-key=${apiKey}&t=${t}&api-signature=${signature}`;
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=48.59&longitude=7.56&hourly=relativehumidity_2m,dewpoint_2m,surface_pressure&models=best_match&daily=rain_sum&current_weather=true&forecast_days=1&timezone=Europe%2FBerlin';

    let weatherStationResponse, weatherResponse, stationDown = false, errorMessage = "";

    try {
        weatherStationResponse = await axios.get(weatherStationUrl);
        console.log(weatherStationResponse.data);
    } catch (error) {
        console.error('Error fetching weather station data:', error);
        stationDown = true;
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message;
        } else {
            errorMessage = error.toString();
        }
    }

    try {
        weatherResponse = await axios.get(weatherUrl);
        console.log(weatherResponse.data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }

    const weatherStationData = weatherStationResponse ? weatherStationResponse.data.sensors[0].data[0] : {};
    const weatherData = weatherResponse ? weatherResponse.data : {};

    let temp_out = weatherStationData.temp_out ? Math.round(((weatherStationData.temp_out - 32) * 5 / 9) * 100) / 100 : weatherData.current_weather.temperature;
    let wind_speed = weatherStationData.wind_speed ? Math.round((weatherStationData.wind_speed * 1.609344) * 100) / 100 : weatherData.current_weather.windspeed;
    let wind_dir = weatherStationData.wind_dir || weatherData.current_weather.winddirection;
    let weather_code = weatherData.current_weather.weathercode;

    let currentTime = weatherData.current_weather.time;
    let timeIndex = weatherData.hourly.time.indexOf(currentTime);

    let hum_out = weatherStationData.hum_out || weatherData.hourly.relativehumidity_2m[timeIndex];
    let dew_point = weatherStationData.dew_point ? Math.round(((weatherStationData.dew_point - 32) * 5 / 9) * 100) / 100 : weatherData.hourly.dewpoint_2m[timeIndex];
    let bar = weatherStationData.bar ? Math.round((weatherStationData.bar * 33.8639) * 100) / 100 : weatherData.hourly.surface_pressure[timeIndex];

    let rain_day_mm = weatherData.daily.rain_sum[0];

    const dataToSend = {
        values: {
          temp_out: temp_out,
          wind_speed: wind_speed,
          wind_dir: wind_dir,
          dew_point: dew_point,
          bar: bar,
          hum_out: hum_out,
          rain_day_mm: rain_day_mm,
          weather_code: weather_code
        },
        error: {
          stationDown: stationDown,
          errorMessage: errorMessage
        }
      };

    // Send error message to Discord if the station is down
    if (stationDown) {
        const payload = {
            discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
            message: errorMessage,
            stationId: stationId
        };

        const params = {
            FunctionName: process.env.DISCORD_NOTIFICATION_LAMBDA,
            InvocationType: 'Event',
            Payload: JSON.stringify(payload)
        };

        try {
            await lambda.invoke(params).promise();
        } catch (error) {
            console.error('Failed to invoke Discord Notification Lambda:', error);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify(dataToSend)
    };
};
