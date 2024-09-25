const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./middleware/errorHandler');

// Initialize express
const app = express();

//CORS options
const corsOptions = {
	origin: 'http://localhost:5173',
	credentials: true // Allow credentials (cookies) to be sent
};

// Apply CORS middleware
app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Routers

app.all('*', (req, res, next) => {
	next(new AppError(`Can not find ${req.originalUrl} on this server`, 404));
});

// Always use the error handler at the end of the file (before exporting app)
app.use(globalErrorHandler);

module.exports = app;
