// transactionModel.js
const mongoose = require('mongoose');

// Define the transaction schema
const transactionSchema = new mongoose.Schema(
	{
		accountId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true // Every transaction must be tied to an account
		},
		amount: {
			type: Number,
			required: true, // Amount involved in the transaction (positive for deposit, negative for withdrawal)
			min: [0, 'Amount must be positive'] // Ensure the amount is always positive
		},
		type: {
			type: String,
			enum: ['deposit', 'withdrawal', 'transfer'], // Define the types of transactions
			required: true
		},
		date: {
			type: Date,
			default: Date.now // Automatically set to the current date when the transaction is created
		},
		status: {
			type: String,
			enum: ['pending', 'completed', 'failed', 'cancelled'], // Transaction can be in one of these statuses
			default: 'pending' // When a transaction is initiated, it's set to 'pending'
		},
		category: {
			type: String,
			enum: [
				'food',
				'entertainment',
				'bills',
				'transportation',
				'shopping',
				'other'
			], // Optional for deposits/withdrawals
			default: 'other' // Default category for transactions without a specific category
		},
		fromAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account', // The source account for transfers (optional for non-transfer transactions)
			required: function () {
				return this.type === 'transfer'; // Only required for transfers
			}
		},
		toAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account', // The destination account for transfers (optional for non-transfer transactions)
			required: function () {
				return this.type === 'transfer'; // Only required for transfers
			}
		},
		note: {
			type: String, // Optional note or description for the transaction
			maxlength: 250 // Limit the note length to keep the database efficient
		}
	},
	{
		timestamps: true // Automatically manage createdAt and updatedAt fields
	}
);

// Pre-save middleware to handle specific logic before saving a transaction
transactionSchema.pre('save', function (next) {
	// Ensure the fromAccount and toAccount are different for transfer transactions
	if (this.type === 'transfer' && this.fromAccount.equals(this.toAccount)) {
		return next(new Error('Transfer cannot occur between the same accounts'));
	}

	// Additional logic for managing limits or other checks can go here
	next();
});

// Static method to get total income (deposits) and expenses (withdrawals)
transactionSchema.statics.getIncomeAndExpenses = async function (
	accountId,
	startDate,
	endDate
) {
	const transactions = await this.aggregate([
		{
			$match: {
				accountId: mongoose.Types.ObjectId(accountId),
				date: { $gte: startDate, $lte: endDate },
				status: 'completed' // Only include completed transactions
			}
		},
		{
			$group: {
				_id: '$type',
				totalAmount: { $sum: '$amount' }
			}
		}
	]);

	const income = transactions
		.filter((t) => t._id === 'deposit')
		.reduce((acc, t) => acc + t.totalAmount, 0);

	const expenses = transactions
		.filter((t) => t._id === 'withdrawal')
		.reduce((acc, t) => acc + t.totalAmount, 0);

	return { income, expenses };
};

// Static method to get spending by category for a specific period
transactionSchema.statics.getSpendingByCategory = async function (
	accountId,
	startDate,
	endDate
) {
	return this.aggregate([
		{
			$match: {
				accountId: mongoose.Types.ObjectId(accountId),
				type: 'withdrawal', // Only include withdrawals (expenses)
				date: { $gte: startDate, $lte: endDate },
				status: 'completed' // Only include completed transactions
			}
		},
		{
			$group: {
				_id: '$category',
				totalSpent: { $sum: '$amount' } // Sum up the amounts for each category
			}
		},
		{
			$sort: { totalSpent: -1 } // Sort by most spent category first
		}
	]);
};

// Static method to get the top 5 largest expenses
transactionSchema.statics.getTopExpenses = async function (
	accountId,
	limit = 5
) {
	return this.find({
		accountId: mongoose.Types.ObjectId(accountId),
		type: 'withdrawal', // Only withdrawals are considered expenses
		status: 'completed' // Only include completed transactions
	})
		.sort({ amount: -1 }) // Sort by the largest amount
		.limit(limit); // Limit to the top 'n' expenses
};

// Static method to get transaction history for charting over time (e.g., line chart for income/expenses)
transactionSchema.statics.getTransactionHistory = async function (
	accountId,
	startDate,
	endDate,
	groupBy = 'month'
) {
	let dateTrunc;

	switch (groupBy) {
		case 'day':
			dateTrunc = { $dayOfMonth: '$date' };
			break;
		case 'week':
			dateTrunc = { $week: '$date' };
			break;
		case 'month':
		default:
			dateTrunc = { $month: '$date' };
			break;
	}

	return this.aggregate([
		{
			$match: {
				accountId: mongoose.Types.ObjectId(accountId),
				date: { $gte: startDate, $lte: endDate },
				status: 'completed' // Only include completed transactions
			}
		},
		{
			$group: {
				_id: dateTrunc, // Group by day/week/month
				totalIncome: {
					$sum: {
						$cond: [{ $eq: ['$type', 'deposit'] }, '$amount', 0] // Sum deposits for income
					}
				},
				totalExpenses: {
					$sum: {
						$cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0] // Sum withdrawals for expenses
					}
				}
			}
		},
		{
			$sort: { _id: 1 } // Sort by the date (ascending)
		}
	]);
};

// Export the model
const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
