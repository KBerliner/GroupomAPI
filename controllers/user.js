const express = require("express");
const User = require("../models/user");
const Post = require("../models/post");
const RevokedToken = require("../models/revokedToken");
const jwt = require("jsonwebtoken");
const addRevokedToken = require("../utils/addRevokedToken").addRevokedToken;
const deleteExpiredRevokedTokens =
	require("../utils/deleteExpiredRevokedTokens").deleteExpiredRevokedTokens;
require("cookie-parser");

const refreshMiddleware = require("../middleware/refresh").refreshExtractor;

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
		const token = jwt.sign(
			{ id: user._id, username: user.username },
			process.env.JWT_SECRET,
			{
				expiresIn: "10s",
			}
		);

		// Generate Refresh token
		const refresh = jwt.sign({ id: user._id }, process.env.REFRESH_JWT_SECRET, {
			expiresIn: "15s",
		});

		// Remove password from the response
		user.password = undefined;

		// Delete all expired refresh tokens from the Database
		deleteExpiredRevokedTokens();

		// Adding JWT to a Cookie
		res.cookie("jwt", token, { httpOnly: true });
		res.cookie("refresh", refresh, { httpOnly: true }).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.logout = async (req, res) => {
	try {
		addRevokedToken(req);
		res.clearCookie("refresh");
		res.clearCookie("jwt").json({ success: true });
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

exports.deleteUser = async (req, res) => {
	try {
		const user = await User.findByIdAndDelete(req.user.id);
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		// TODO: remove the cookie and the user's posts
		await Post.deleteMany({ authorId: req.user.id });
		res.cookie("jwt", "", { maxAge: 1 }).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.getPosts = async (req, res) => {
	try {
		const posts = await Post.find({ _id: req.params.id });
		res.json(posts);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.refresh = async (req, res) => {
	try {
		const refreshToken = req.cookies["refresh"];

		// Checking if the refresh token is revoked
		const isRevoked = await RevokedToken.findOne({ token: refreshToken });
		if (isRevoked) {
			return res.status(401).json({ error: "Refresh token Revoked!" });
		}

		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		const token = jwt.sign(
			{ id: user._id, username: user.username },
			process.env.JWT_SECRET,
			{
				expiresIn: "1m",
			}
		);

		res.cookie("jwt", token, { httpOnly: true }).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};
