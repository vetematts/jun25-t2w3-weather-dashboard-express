const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());

// Limit to 5 /weather requests per minute per IP.
const weatherLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    message: { error: "Too many weather requests, cool down!" }
});

app.use(weatherLimiter);

// Logger middleware
app.use((request, response, next) => {
    console.log(`[WEATHER] ${request.method} ${request.url} at ${new Date().toISOString()}`);
    next();
});

validateCoords = (request, response, next) => {
    const { latitude, longitude } = request.body;

    if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
    ) {
        return response.status(400).json({
            error: 'Invalid or missing Co-ordinates!'
        });
    }
    next();
}

function blockAntartica(request, response, next) {
    const { latitude } = request.body;

    if (latitude <-89) {
        return response.status(403).json({
            error: "Sorry, no weather for Antartica"
        });
    }
    next();
}

app.get('/', (request, response) => {
    response.json({
        "message": "Hello World!"
    });
});

app.post('/weather', validateCoords, blockAntartica, async (request, response, next) => {
    const { latitude, longitude } = request.body;
    try {
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`);

        const data = await weatherResponse.json();

        if(!response.current_weather){
            // Passes API fetch error to error middleware
            throw new Error(data.error || 'Failed to fetch weather data');
        }

        response.json({
            location: { latitude, longitude },
            current: data.current_weather,
            units: data.current_weather_units
        });
    } catch (err) {
        next(err);
    }
}
);

// Error Handling Middleware - activates when the next() method is called with error passed in the param, like next(error) OR when a new error is thrown (throw new ERROR(...))
app.use((error, request, response, next) => {
    console.log('[WEATHER ERROR]: ', error.stack);
    response.status(500).json({
        error: 'Whoops! Something broke with the weather!'
    });
    next();
});

module.exports = app;
