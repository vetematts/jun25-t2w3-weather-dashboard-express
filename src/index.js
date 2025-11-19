const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dummykey';

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

dummyAuth = (request, response, next) => {
    // For demo, simulate the authenticated users only
    const authenticated = true;
    if (!authenticated){
        return response.status(401).json({
            error: "You must be logged in!!"
        });
    }
    next();
}

checkAdminRole = (request, response, next) => {
    // For demo, simulate getting admin check from the token/header
    const user = {isAdmin: true};
    if (!user || !user.isAdmin){
        response.status(403).json({
            error: "Admins only."
        });
    }
    next();
}

app.get('/', (request, response) => {
    response.json({
        "message": "Hello World!"
    });
});

app.post('/login', (request, response) => {
    const {username, password} = request.body;

    // Simulate user verification (replace it with real verification)
    if (username == 'user' && password == 'pass') {
        const payload = { username };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
        return response.json({
            token
        });
    }
    response.status(401).json({
        error: 'Invalid credentials'
    });
});

authenticateToken = (request, response, next) => {
    const authHeader = request.headers['authorization'];
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        response.status(401).json({
            error: 'Token is missing.'
        });
    }

    jwt.verify(token, JWT_SECRET, (error, user) => {
        if (error) {
            return response.status(403).json({
                error: 'Invalid or expired token'
            });
        }
        request.user = user;
        next();
    })
}

app.post('/weather', authenticateToken, validateCoords, blockAntartica, async (request, response, next) => {
    const { latitude, longitude } = request.body;
    try {
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current`);

        const data = await weatherResponse.json();
        console.log(data);

        if(!data.current){
            // Passes API fetch error to error middleware
            throw new Error(data.error || 'Failed to fetch weather data');
        }

        response.json({
            location: { latitude, longitude },
            current: data.current,
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
