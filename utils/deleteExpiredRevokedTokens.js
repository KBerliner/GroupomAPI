require("mongoose");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/revokedToken"); // Your Mongoose model
require("express");

exports.deleteExpiredRevokedTokens = async () => {
	try {
		// Find revoked tokens
		const revokedTokens = await RevokedToken.find({});

		// Filter for expired tokens
		const expiredTokens = revokedTokens.filter((tokenDoc) => {
			try {
				const decoded = jwt.verify(
					tokenDoc.token,
					process.env.REFRESH_JWT_SECRET
				);
				return decoded.exp < Date.now() / 1000; // Check if 'exp' is in the past
			} catch (err) {
				// If the token can't be decoded, consider it invalid and delete it
				return true;
			}
		});

		// Delete expired tokens
		if (expiredTokens.length > 0) {
			await RevokedToken.deleteMany({
				_id: { $in: expiredTokens.map((t) => t._id) },
			});
			console.log(`Deleted ${expiredTokens.length} expired revoked tokens.`);
		} else {
			console.log("No expired revoked tokens found.");
		}
	} catch (error) {
		console.error("Error deleting expired tokens:", error);
	}
};
