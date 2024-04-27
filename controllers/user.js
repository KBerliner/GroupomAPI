const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
	const { username, email, password } = req.body;

	// Validate request body
	if (!username || !email || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	// Create a new user instance
	const user = new User(req.body);

	try {
		// Save the user to the database
		await user.save();
		// Remove the password from the response
		user.password = undefined;
		res.status(201).json({ message: "User created successfully!", user });
	} catch (error) {
		if (error.code === 11000) {
			// Duplicate email error
			res.status(400).json({ error: "Email is already taken." });
		} else {
			// Other errors
			console.error(error);
			res.status(500).json({ error: "Internal server error." });
		}
	}
};

exports.login = async (req, res) => {
	const { email, password } = req.body;

	// Validate request body
	if (!email || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	try {
		// Find user by email
		const user = await User.findOne({ email }).select("+password");
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		// Check if the provided password is correct
		const isPasswordCorrect = await user.isCorrectPassword(password);
		if (!isPasswordCorrect) {
			return res.status(401).json({ error: "Incorrect password." });
		}

		// Changing the last login time of the user

		user.lastLogin = Date.now();
		await user.save();

		// Generate JWT token
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1m",
		});

		// Remove password from the response
		user.password = undefined;

		// Adding JWT to a Cookie
		res.cookie("jwt", token, { httpOnly: true }).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.getUsers = async (req, res) => {
	try {
		const users = await User.find();
		res.json(users);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};
