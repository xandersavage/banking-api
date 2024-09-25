const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
	const message = `Invalid ${err.path}: ${err.value}`;
	return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
	const value = err.keyValue.name;
	console.log(value);

	const message = `Duplicate field value: ${value}. Please use another value`;
	return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
	// we use Object.values to loop over the elements of an object
	const errors = Object.values(err.errors).map((el) => el.message);
	const message = `Invalid input data. ${errors.join('. ')}`;
	return new AppError(message, 400);
};

const handleJWTError = () =>
	new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () =>
	new AppError('Your token has expired. Please log in again', 401);

const sendDevError = (err, req, res) => {
	if (req.originalUrl.startsWith('/api')) {
		return res.status(err.statusCode).json({
			status: err.status,
			message: err.message,
			error: err,
			stack: err.stack
		});
	} else {
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong',
			msg: err.message
		});
	}
};

const sendProdError = (err, req, res) => {
	if (req.originalUrl.startsWith('/api')) {
		// Operational error, trusted: send message to client
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message
			});
			// Programming or unknown error: do not leak details to client
		}
		// 1) Log error
		console.error('FATAL ERROR!', err);

		// 2) Send generic message
		return res.status(500).json({
			status: 'error',
			message: 'something went very wrong'
		});
	}
	// Operational error, trusted: send message to client
	if (err.isOperational) {
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong',
			msg: err.message
		});
		// Programming or unknown error: do not leak details to client
	}
	// 1) Log error
	console.error('FATAL ERROR!', err);

	// 2) Send generic message
	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong',
		msg: 'Please try again later'
	});
};

module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		sendDevError(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = { ...err };
		error.message = err.message;

		if (error.name === 'CastError') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		if (error.name === 'ValidationError')
			error = handleValidationErrorDB(error);
		if (error.name === 'JsonWebTokenError') error = handleJWTError();
		if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
		sendProdError(error, req, res);
	}
};
