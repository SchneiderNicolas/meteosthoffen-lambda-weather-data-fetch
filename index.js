const crypto = require('crypto');
const axios = require('axios');

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

    const url = `https://api.weatherlink.com/v2/current/${stationId}?api-key=${apiKey}&t=${t}&api-signature=${signature}`;

    try {
        const response = await axios.get(url);
        console.log(response.data);
        return {
            statusCode: 200,
            body: response.data
        };
    } catch (error) {
        console.error(error);
        if (error.response) {
            return {
                statusCode: error.response.status,
                body: error.message
            };
        } else if (error.request) {
            return {
                statusCode: 500,
                body: 'The request was made but no response was received'
            };
        } else {
            return {
                statusCode: 500,
                body: 'An unknown error occurred'
            };
        }
    }
};
