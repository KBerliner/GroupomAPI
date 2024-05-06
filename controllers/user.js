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

const AWS = require("../utils/aws");

// Initializing S3 instance
const s3 = new AWS.S3();

exports.signup = async (req, res) => {
	// Setting Variables
	const body = req.body;
	const { username, email, password } = body;
	const MIME_TYPES = {
		"image/jpg": "jpg",
		"image/jpeg": "jpg",
		"image/png": "png",
	};

	// Validate request body
	if (!username || !email || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	// Create a new user instance
	let user = undefined;

	// Using request file
	if (req.file) {
		const uploadParams = {
			Bucket: "groupomaniapfp",
			Key: `${Date.now().toString()}.${MIME_TYPES[req.file.mimetype]}`,
			Body: req.file.buffer,
			ContentType: `image/${MIME_TYPES[req.file.mimetype]}`,
			ContentDisposition: "inline",
		};

		s3.upload(uploadParams, async (err, data) => {
			if (err) {
				console.error("Error uploading file to S3: ", err);
				res.status(500).json({
					error: "Failed to upload profile picture to S3",
					message: err,
				});
			} else {
				console.log("Successfully uploaded profile picture to S3: ", data);

				// Adding the URL to the user Object
				user = new User({ ...body, profilePictureUrl: data.Location });
				try {
					console.log("USER: ", user);
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
			}
		});
	} else {
		user = new User(body);
		try {
			console.log("USER: ", user);
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
		const token = jwt.sign({ user }, process.env.JWT_SECRET, {
			expiresIn: "15m",
		});

		// Generate Refresh token
		const refresh = jwt.sign({ id: user._id }, process.env.REFRESH_JWT_SECRET, {
			expiresIn: "7d",
		});

		// Remove password from the response
		user.password = undefined;

		// Delete all expired refresh tokens from the Database
		deleteExpiredRevokedTokens();

		// Adding JWT to a Cookie
		res.cookie("jwt", token, { httpOnly: true, same_site: "none" });
		res
			.cookie("refresh", refresh, { httpOnly: true })
			.json({ success: true, user });
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

exports.persist = async (req, res) => {
	try {
		const user = await User.findById(req.user.user._id);
		console.log(req.user);
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		user.lastLogin = Date.now();
		await User.updateOne({ _id: req.user.user.id }, user);

		res.json({ user });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.sendFriendRequest = async (req, res) => {
	try {
		const user = await User.findById(req.user.user._id);
		const recipient = await User.findById(req.body.recipientId);
		if (!user || !recipient) {
			return res.status(404).json({ error: "User or recipient not found." });
		}

		user.sentRequests.push(req.body);
		recipient.receivedRequests.push(req.body);

		await User.updateOne({ _id: req.user.user.id }, user);
		await User.updateOne({ _id: req.body.recipientId }, recipient);

		res.status(201).json(req.body);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};
