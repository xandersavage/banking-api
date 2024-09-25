const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

// Deposit funds into an account
exports.depositFunds = async (accountId, amount, note = '') => {
	// Step 1: Find the account
	const account = await Account.findById(accountId);
	if (!account) {
		throw new AppError('Account not found.', 404);
	}

	// Step 2: Update the account balance
	account.balance += amount;
	await account.save();

	// Step 3: Create a deposit transaction record
	const transaction = await Transaction.create({
		accountId,
		amount,
		type: 'deposit',
		note
	});

	return transaction;
};

// Withdraw funds from an account
exports.withdrawFunds = async (accountId, amount, note = '') => {
	// Step 1: Find the account
	const account = await Account.findById(accountId);
	if (!account) {
		throw new AppError('Account not found.', 404);
	}

	// Step 2: Check if the account has enough balance
	if (account.balance < amount) {
		throw new AppError('Insufficient balance for this transaction.', 400);
	}

	// Step 3: Update the account balance
	account.balance -= amount;
	await account.save();

	// Step 4: Create a withdrawal transaction record
	const transaction = await Transaction.create({
		accountId,
		amount,
		type: 'withdrawal',
		note
	});

	return transaction;
};

// Transfer funds between two accounts
exports.transferFunds = async (
	fromAccountId,
	toAccountId,
	amount,
	note = ''
) => {
	// Start a session
	const session = await mongoose.startSession();

	try {
		// Start a transaction
		session.startTransaction();

		// Step 1: Validate that both accounts are different
		if (fromAccountId === toAccountId) {
			throw new AppError('Cannot transfer between the same accounts.', 400);
		}

		// Step 2: Find both accounts (using session)
		const fromAccount = await Account.findById(fromAccountId).session(session);
		const toAccount = await Account.findById(toAccountId).session(session);

		if (!fromAccount || !toAccount) {
			throw new AppError('One or both of the accounts do not exist.', 404);
		}

		// Step 3: Check if the source account has enough balance
		if (fromAccount.balance < amount) {
			throw new AppError('Insufficient balance for this transaction.', 400);
		}

		// Step 4: Deduct from the source account balance
		fromAccount.balance -= amount;
		await fromAccount.save({ session });

		// Step 5: Add to the destination account balance
		toAccount.balance += amount;
		await toAccount.save({ session });

		// Step 6: Create a transfer transaction record
		const transaction = await Transaction.create(
			[
				{
					accountId: fromAccountId,
					fromAccount: fromAccountId,
					toAccount: toAccountId,
					amount,
					type: 'transfer',
					note
				}
			],
			{ session }
		);

		// Commit the transaction
		await session.commitTransaction();
		session.endSession();

		return transaction;
	} catch (error) {
		// If any error occurs, abort the transaction
		await session.abortTransaction();
		session.endSession();
		throw error;
	}
};

// Get income and expenses for a specific account and time period
exports.getIncomeAndExpenses = async (accountId, startDate, endDate) => {
	const { income, expenses } = await Transaction.getIncomeAndExpenses(
		accountId,
		startDate,
		endDate
	);
	return { income, expenses };
};

// Get spending by category for a specific account and time period
exports.getSpendingByCategory = async (accountId, startDate, endDate) => {
	const spendingByCategory = await Transaction.getSpendingByCategory(
		accountId,
		startDate,
		endDate
	);
	return spendingByCategory;
};

// Get top 'n' expenses for a specific account
exports.getTopExpenses = async (accountId, limit = 5) => {
	const topExpenses = await Transaction.getTopExpenses(accountId, limit);
	return topExpenses;
};

// Get transaction history for charting (grouped by day/week/month)
exports.getTransactionHistory = async (
	accountId,
	startDate,
	endDate,
	groupBy = 'month'
) => {
	const transactionHistory = await Transaction.getTransactionHistory(
		accountId,
		startDate,
		endDate,
		groupBy
	);
	return transactionHistory;
};
