const catchAsync = require('./catchAsync');
const APIFeatures = require('./apiFeatures');
const AppError = require('./appError');

exports.getOne = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		let query = Model.findById(req.params.id); //await
		if (popOptions) query = query.populate(popOptions);
		const doc = await query;

		if (!doc) {
			return next(new AppError('No document found with that ID', 404));
		}

		res.status(200).json({
			status: 'success',
			data: {
				data: doc
			}
		});
	});

exports.getAll = (Model) =>
	catchAsync(async (req, res, next) => {
		// To allow for filtering by category
		let filter = {};
		if (req.query.category) filter = { category: req.query.category };

		const features = new APIFeatures(Model.find(filter), req.query, Model)
			.filter()
			.sort()
			.limitFields();
		await features.paginate();
		const doc = await features.query;

		// Wait for totalDocuments and totalPages to be calculated
		const totalDocuments = features.totalDocuments;
		const totalPages = features.totalPages;

		res.status(200).json({
			status: 'success',
			length: doc.length,
			totalPages,
			totalDocuments,
			data: {
				data: doc
			}
		});
	});

exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndDelete(req.params.id);

		if (!doc) {
			return next(new AppError('No document found with that ID', 404));
		}

		res.status(204).json({
			status: 'success',
			data: null
		});
	});

exports.updateOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true
		});

		if (!doc) {
			return next(new AppError('No doc found with that ID', 404));
		}

		res.status(200).json({
			status: 'success',
			data: {
				data: doc
			}
		});
	});

exports.createOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.create(req.body);
		res.status(201).json({
			status: 'success',
			data: {
				data: doc
			}
		});
	});
