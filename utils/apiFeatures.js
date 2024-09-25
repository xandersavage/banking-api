class APIFeatures {
	constructor(query, queryString, model) {
		this.query = query;
		this.queryString = queryString;
		this.model = model;
		this.totalDocuments = 0; // Initialize totalDocuments
		this.totalPages = 0; // Initialize totalPages
	}

	filter() {
		// FILTERING
		const queryObject = { ...this.queryString };
		const excludedFields = ['page', 'sort', 'limit', 'fields'];
		excludedFields.forEach((el) => delete queryObject[el]);
		let queryStr = JSON.stringify(queryObject);

		//ADVANCED FILTERING
		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

		this.query = this.query.find(JSON.parse(queryStr));
		// const tours = await Tour.find().where('difficulty').equals('easy').where('duration').equals(5)
		return this;
	}

	sort() {
		//SORTING
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('-createdAt');
		}

		return this;
	}

	limitFields() {
		//LIMITING
		if (this.queryString.fields) {
			const fields = this.queryString.fields.split(',').join(' ');
			this.query = this.query.select(fields);
		} else {
			this.query = this.query.select('-__v');
		}

		return this;
	}

	async paginate() {
		//PAGINATION
		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 10;
		const skip = (page - 1) * limit;

		// Store the original query for counting documents
		const countQuery = this.model.find({ ...this.query._conditions });

		// Apply pagination to the query
		this.query = this.query.skip(skip).limit(limit);

		this.totalDocuments = await countQuery.countDocuments();
		this.totalPages = Math.ceil(this.totalDocuments / limit);

		return this;
	}
}
module.exports = APIFeatures;
