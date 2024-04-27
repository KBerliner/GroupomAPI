// Installing Dependencies

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Creating a blueprint for the "User" object

const userSchema = new mongoose.Schema({
	username: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	role: { type: String, enum: ["admin"], default: "admin" },
	lastLogin: { type: Date, default: Date.now },
	created: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	profilePictureUrl: { type: String },
});

// Encrypting the Password before saving to the database

userSchema.pre("save", async function (next) {
	console.log("THIS", this);
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

// Adding a validator method

userSchema.methods.isCorrectPassword = async function (password) {
	return bcrypt.compare(password, this.password);
};

// Exporting the User blueprint

module.exports = mongoose.model("User", userSchema);
