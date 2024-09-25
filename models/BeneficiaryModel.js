const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Beneficiary Schema
const beneficiarySchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User', // Reference to the user who owns the beneficiary list
			required: [true, 'A beneficiary must be associated with a user.']
		},
		beneficiaryAccount: {
			type: Schema.Types.ObjectId,
			ref: 'Account', // Reference to the beneficiary's account
			required: [true, 'Please provide the beneficiary account.']
		},
		nickname: {
			type: String,
			trim: true,
			maxlength: [50, 'Nickname must be less than or equal to 50 characters.'],
			default: '' // Nickname is optional
		},
		notes: {
			type: String,
			trim: true,
			maxlength: [200, 'Notes must be less than or equal to 200 characters.'],
			default: '' // Optional notes or metadata about the beneficiary
		},
		status: {
			type: String,
			enum: ['active', 'inactive'],
			default: 'active', // Beneficiary is active by default
			required: [true, 'Status is required.']
		}
	},
	{
		timestamps: true // Automatically adds createdAt and updatedAt fields
	}
);

// Unique index to prevent duplicate beneficiaries for the same user
beneficiarySchema.index({ user: 1, beneficiaryAccount: 1 }, { unique: true });

// Static method to update beneficiary status (activate/deactivate)
beneficiarySchema.statics.updateBeneficiaryStatus = async function (
	userId,
	beneficiaryId,
	newStatus
) {
	const beneficiary = await this.findOne({ user: userId, _id: beneficiaryId });
	if (!beneficiary) {
		throw new Error('Beneficiary not found');
	}

	beneficiary.status = newStatus;
	await beneficiary.save();
	return beneficiary;
};

// Export the Beneficiary model
const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

module.exports = Beneficiary;
