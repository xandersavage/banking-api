// accountModel.js
const mongoose = require('mongoose');

// Define the account schema
const accountSchema = new mongoose.Schema(
	{
		accountNumber: {
			type: String,
			unique: true,
			required: [true, 'Account number is required.']
		},
		accountType: {
			type: String,
			enum: ['savings', 'current'], // Could also be extended with other types
			required: [true, 'Please specify the account type.']
		},
		balance: {
			type: Number,
			required: [true, 'Balance is required.'],
			default: 0, // Initial balance starts at 0
			min: [0, 'Balance cannot be negative.']
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User', // Reference the User model
			required: [true, 'Account must have an owner.']
		},
		currency: {
			type: String,
			required: [true, 'Currency type is required.'],
			default: 'USD'
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'suspended', 'closed'],
			default: 'active'
		},
		beneficiaries: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User' // Users who are listed as beneficiaries
			}
		],
		// **New Fields for Daily Transfer Limit**
		dailyTransferLimit: {
			type: Number,
			required: [true, 'Daily transfer limit is required.'],
			default: 10000, // Default limit, can be adjusted as needed
			min: [0, 'Daily transfer limit cannot be negative.']
		},
		amountTransferredToday: {
			type: Number,
			default: 0,
			min: [0, 'Transferred amount cannot be negative.']
		},
		lastTransferDate: {
			type: Date,
			default: Date.now
		}
	},
	{
		timestamps: true // Automatically adds createdAt and updatedAt fields
	}
);

// Middleware to automatically assign a unique account number if not provided
accountSchema.pre('save', async function (next) {
	if (!this.accountNumber) {
		// Generate a unique account number (customize this logic as needed)
		this.accountNumber = `ACCT-${Date.now()}-${Math.floor(
			Math.random() * 10000
		)}`;
	}
	next();
});

// Method to add a beneficiary to the account
accountSchema.methods.addBeneficiary = async function (userId) {
	if (!this.beneficiaries.includes(userId)) {
		this.beneficiaries.push(userId);
		await this.save();
	}
	return this.beneficiaries;
};

// Method to remove a beneficiary from the account
accountSchema.methods.removeBeneficiary = async function (userId) {
	this.beneficiaries = this.beneficiaries.filter(
		(beneficiaryId) => beneficiaryId.toString() !== userId.toString()
	);
	await this.save();
	return this.beneficiaries;
};

// **Optional: Method to Reset Daily Transfer Amount**
accountSchema.methods.resetDailyTransferAmount = async function () {
	this.amountTransferredToday = 0;
	this.lastTransferDate = new Date();
	await this.save();
};

const Account = mongoose.model('Account', accountSchema);
module.exports = Account;
