const mongoose = require('mongoose');
const app = require('./app');
const port = process.env.PORT || 3000;
const DB = process.env.DATABASE_LOCAL;

process.on('uncaughtException', (err) => {
	console.log('UNCAUGHT EXCEPTION! SHUTTING DOWN');
	console.log(err.name, err.message);
	process.exit(1);
});

mongoose
	.connect(DB)
	.then(() => console.log('MongoDB connected successfully'))
	.catch((err) => console.error('MongoDB connection error:', err));

const server = app.listen(port, () => {
	console.log(`Banking api is running on port: ${port}`);
});

process.on('unhandledRejection', (err) => {
	console.log('UNHANDLED REJECTION! Shutting down....');
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});

process.on('SIGTERM', () => {
	console.log('SIGTERM received. Shutting down gracefully');
	server.close(() => {
		console.log('Process terminated');
	});
});
