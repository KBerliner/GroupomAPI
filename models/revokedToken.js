// Installing Dependencies

const mongoose = require("mongoose");

// Creating a blueprint for the "Post" object

const revokedTokenSchema = mongoose.model(
	"revokedToken",
	new mongoose.Schema({
		token: { type: String, required: true },
	})
);

// Exporting the Post Blueprint

module.exports = revokedTokenSchema;
