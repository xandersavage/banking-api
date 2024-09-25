// userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserSettings = require('./userSettingsModel');

// Define the user schema
const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Please provide your name.'],
			trim: true,
			minlength: [3, 'Name must have more than 3 characters.']
		},
		email: {
			type: String,
			required: [true, 'Please provide your email.'],
			unique: true, // Ensures email uniqueness
			lowercase: true, // Store email in lowercase
			validate: {
				validator: function (email) {
					// Basic regex for email validation
					return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
				},
				message: 'Please provide a valid email address.'
			}
		},
		password: {
			type: String,
			required: [true, 'Please provide a password.'],
			minlength: 8, // Set minimum password length
			select: false // Prevent password from being returned in queries
		},
		passwordConfirm: {
			type: String,
			required: [true, 'Please confirm your password.'],
			validate: {
				// This works only on `save` and `create`
				validator: function (passwordConfirm) {
					return passwordConfirm === this.password;
				},
				message: 'Passwords do not match.'
			}
		},
		phone: {
			type: String,
			required: [true, 'Please provide your phone number.']
		},
		address: {
			type: String,
			trim: true
		},
		gender: {
			type: String,
			enum: ['male', 'female', 'other'] // To keep it flexible
		},
		dateOfBirth: {
			type: Date,
			required: [true, 'Please provide your date of birth.']
		},
		accounts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Account' // Referencing the Account model for user accounts
			}
		],
		role: {
			type: String,
			enum: ['user', 'admin'], // Differentiate between users and admins
			default: 'user'
		},
		passwordChangedAt: Date, // Track when the user last changed their password
		passwordResetToken: String, // Token used to reset passwords
		passwordResetExpires: Date, // Expiration time for reset token
		emailVerified: {
			type: Boolean,
			default: false // Whether the email has been verified or not
		},
		emailVerificationToken: String, // Token to verify email
		active: {
			type: Boolean,
			default: true, // To "soft-delete" user accounts
			select: false
		}
	},
	{
		timestamps: true // Automatically manage createdAt and updatedAt fields
	}
);

// Virtual to get all beneficiaries for a user
userSchema.virtual('beneficiaries', {
	ref: 'Beneficiary',
	foreignField: 'user',
	localField: '_id'
});

// Middleware to hash password before saving the user to the database
userSchema.pre('save', async function (next) {
	// Only run if the password was modified (not on other fields)
	if (!this.isModified('password')) return next();

	// Hash the password using bcrypt
	this.password = await bcrypt.hash(this.password, 12);

	// Remove the passwordConfirm field since it's only for validation
	this.passwordConfirm = undefined;
	next();
});

const UserSettings = require('./path-to-UserSettings-model'); // Ensure correct path

userSchema.post('save', async function (doc, next) {
	// Only create settings if this is a new user
	if (this.isNew) {
		await UserSettings.create({ user: doc._id }); // Create user settings linked to this user
	}
	next();
});

// Middleware to set passwordChangedAt when user changes the password
userSchema.pre('save', function (next) {
	if (!this.isModified('password') || this.isNew) return next();

	this.passwordChangedAt = Date.now() - 1000; // Ensure it’s before token issuance
	next();
});

// Instance method to check if the provided password matches the hashed password
userSchema.methods.correctPassword = async function (
	candidatePassword,
	userPassword
) {
	return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if the password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
	if (this.passwordChangedAt) {
		const changedTimestamp = parseInt(
			this.passwordChangedAt.getTime() / 1000,
			10
		);
		return JWTTimeStamp < changedTimestamp; // Token issued before password change
	}
	return false;
};

// Instance method to create a password reset token
userSchema.methods.createPasswordResetToken = function () {
	const resetToken = crypto.randomBytes(32).toString('hex');

	this.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// Token expires after 10 minutes
	this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

	return resetToken;
};

// Instance method to create email verification token
userSchema.methods.createEmailVerificationToken = function () {
	const verificationToken = crypto.randomBytes(32).toString('hex');

	this.emailVerificationToken = crypto
		.createHash('sha256')
		.update(verificationToken)
		.digest('hex');

	return verificationToken; // Send the raw token to the user's email
};

// Middleware to filter out inactive users from any query results
userSchema.pre(/^find/, function (next) {
	this.find({ active: { $ne: false } });
	next();
});

// Export the User model
const User = mongoose.model('User', userSchema);
module.exports = User;
