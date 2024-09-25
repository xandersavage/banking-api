const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Transfer Limits Schema
const transferLimitsSchema = new Schema({
	dailyLimit: {
		type: Number,
		default: 10000,
		min: [0, 'Daily limit cannot be negative.'],
		max: [1000000, 'Daily limit cannot exceed 1,000,000.']
	},
	weeklyLimit: {
		type: Number,
		default: 50000,
		min: [0, 'Weekly limit cannot be negative.'],
		max: [5000000, 'Weekly limit cannot exceed 5,000,000.']
	},
	monthlyLimit: {
		type: Number,
		default: 200000,
		min: [0, 'Monthly limit cannot be negative.'],
		max: [20000000, 'Monthly limit cannot exceed 20,000,000.']
	}
});

// Define the Notification Preferences Schema
const notificationPreferencesSchema = new Schema({
	transferLimitApproaching: {
		type: Boolean,
		default: true
	},
	transferLimitExceeded: {
		type: Boolean,
		default: true
	},
	transactionCompleted: {
		type: Boolean,
		default: true
	},
	largeTransactions: {
		type: Boolean,
		default: true
	},
	newDeviceLogin: {
		type: Boolean,
		default: true
	}
});

// Define the User Settings Schema
const userSettingsSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Settings must be associated with a user.'],
			unique: true
		},
		transferLimits: {
			type: transferLimitsSchema,
			default: () => ({})
		},
		notificationPreferences: {
			type: notificationPreferencesSchema,
			default: () => ({})
		},
		currencyPreference: {
			type: String,
			default: 'USD',
			enum: {
				values: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
				message: '{VALUE} is not a supported currency'
			}
		},
		twoFactorAuthEnabled: {
			type: Boolean,
			default: false
		},
		lastLoginDate: {
			type: Date,
			default: null
		}
	},
	{
		timestamps: true
	}
);

// Middleware to ensure transfer limits are logical
userSettingsSchema.pre('save', function (next) {
	const limits = this.transferLimits;
	if (limits.dailyLimit > limits.weeklyLimit) {
		return next(new Error('Daily limit cannot be greater than weekly limit.'));
	}
	if (limits.weeklyLimit > limits.monthlyLimit) {
		return next(
			new Error('Weekly limit cannot be greater than monthly limit.')
		);
	}
	next();
});

// Static method to update transfer limits
userSettingsSchema.statics.updateTransferLimits = async function (
	userId,
	newLimits
) {
	return this.findOneAndUpdate(
		{ user: userId },
		{ $set: { transferLimits: newLimits } },
		{ new: true, runValidators: true }
	);
};

// Static method to update notification preferences
userSettingsSchema.statics.updateNotificationPreferences = async function (
	userId,
	newPreferences
) {
	return this.findOneAndUpdate(
		{ user: userId },
		{ $set: { notificationPreferences: newPreferences } },
		{ new: true, runValidators: true }
	);
};

// Instance method to check if a transfer amount exceeds any limit
userSettingsSchema.methods.isTransferWithinLimits = function (amount) {
	const { dailyLimit, weeklyLimit, monthlyLimit } = this.transferLimits;
	return {
		isWithinDaily: amount <= dailyLimit,
		isWithinWeekly: amount <= weeklyLimit,
		isWithinMonthly: amount <= monthlyLimit
	};
};

// Virtual for formatted currency preference
userSettingsSchema.virtual('formattedCurrency').get(function () {
	const currencySymbols = {
		USD: '$',
		EUR: '€',
		GBP: '£',
		JPY: '¥',
		CAD: 'C$',
		AUD: 'A$'
	};
	return currencySymbols[this.currencyPreference] || this.currencyPreference;
});

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

module.exports = UserSettings;
