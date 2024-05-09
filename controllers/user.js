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
		const user = await User.findByIdAndDelete(req.user.user._id);
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
		console.log("heres the req body", req.body);
		const user = await User.findById(req.user.user._id);
		const recipient = await User.findById(req.body.recipientId);
		if (!user || !recipient) {
			return res.status(404).json({ error: "User or recipient not found." });
		}

		if (recipient.blocked.includes(user)) {
			return res.status(403).json({ error: "User is blocked." });
		}

		// console.log(
		// 	recipient.friends[0],
		// 	user._id,
		// 	recipient.friends[0].senderId == user._id.toString()
		// );
		if (
			recipient.friends.findIndex(
				(friend) => friend.senderId == user._id.toString()
			) !== -1
		) {
			return res.status(403).json({ error: "User is already friends." });
		}

		if (
			recipient.receivedRequests.findIndex(
				(request) => request.senderId === user._id.toString()
			) !== -1 ||
			user.sentRequests.findIndex(
				(request) => request.recipientId === req.body.recipientId
			) !== -1
		) {
			return res
				.status(403)
				.json({ error: "User has already sent a friend request." });
		}

		// console.log(
		// 	"This is the recipient's sent requests and the user's id: ",
		// 	recipient.sentRequests,
		// 	user._id.toString()
		// );

		if (
			recipient.sentRequests.findIndex(
				(request) => request.recipientId == user._id.toString()
			) !== -1
		) {
			// console.log("they will be friends");
			console.log(
				recipient.sentRequests,
				recipient.sentRequests.filter(
					(request) => request.recipientId !== user._id.toString()
				)
			);
			recipient.sentRequests = recipient.sentRequests.filter(
				(request) => request.recipientId !== user._id.toString()
			);
			user.receivedRequests = user.receivedRequests.filter(
				(request) => request.senderId !== recipient._id.toString()
			);

			user.friends.push({
				senderId: recipient._id.toString(),
				senderName: recipient.username,
				date: Date.now(),
			});
			recipient.friends.push({
				senderId: user._id.toString(),
				senderName: user.username,
				date: Date.now(),
			});

			await User.updateOne({ _id: user._id }, user);
			await User.updateOne({ _id: req.body.recipientId }, recipient);

			return res.status(200).json({
				request: {
					senderId: recipient._id,
					senderName: recipient.username,
					date: Date.now(),
				},
				type: "friend",
			});
		}

		console.log("Response #2 for some reason");

		user.sentRequests.push(req.body);
		recipient.receivedRequests.push(req.body);

		await User.updateOne({ _id: user._id }, user);
		await User.updateOne({ _id: req.body.recipientId }, recipient);

		res.status(201).json({
			request: {
				senderId: recipient._id,
				senderName: recipient.username,
				date: Date.now(),
			},
			type: "sent",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.denyFriendRequest = async (req, res) => {
	try {
		const user = await User.findById(req.user.user._id);
		const sender = await User.findById(req.body.senderId);

		if (!user || !sender) {
			return res.status(404).json({ error: "User or sender not found." });
		}

		user.receivedRequests.filter(
			(request) => request.senderId !== req.body.senderId
		);

		sender.sentRequests.filter(
			(request) => request.recipientId !== req.body.recipientId
		);

		await User.updateOne({ _id: req.user.user.id }, user);
		await User.updateOne({ _id: req.body.senderId }, sender);

		res.status(200).json(req.body);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.acceptFriendRequest = async (req, res) => {
	try {
		const user = await User.findById(req.user.user._id);
		const sender = await User.findById(req.body.senderId);

		if (!user || !sender) {
			return res.status(404).json({ error: "User or sender not found." });
		}

		user.receivedRequests.filter(
			(request) => request.senderId !== req.body.senderId
		);

		sender.sentRequests.filter(
			(request) => request.recipientId !== req.body.recipientId
		);

		user.friends.push({
			_id: req.body.senderId,
			username: req.body.senderName,
			senderPfp: req.body.senderPfp,
			date: req.body.date,
		});
		sender.friends.push({
			_id: user._id,
			username: user.username,
			senderPfp: user.profilePictureUrl,
			date: req.body.date,
		});

		await User.updateOne({ _id: user._id }, user);
		await User.updateOne({ _id: req.body.senderId }, sender);

		res.status(200).json(req.body);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.block = async (req, res) => {
	try {
		const user = await User.findById(req.user.user._id);
		const recipient = await User.findById(req.body.recipientId);

		if (!user || !recipient) {
			return res.status(404).json({ error: "User or recipient not found." });
		}

		if (recipient.blocked.includes(user._id)) {
			return res.status(403).json({ error: "User is already blocked." });
		}

		user.blocked.push(recipient._id);

		await User.updateOne({ _id: user._id }, user);

		res.status(200).json(req.body);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};
