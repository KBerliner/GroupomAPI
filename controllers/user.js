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

// Reducing repetition with an error handling function
const handleError = (res, error) => {
	console.error(error);
	res.status(500).json({ error: "Internal server error." });
};

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
						handleError(error);
					}
				}
			}
		});
	} else {
		user = new User(body);
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
				handleError(error);
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
		console.log(user?.profilePictureUrl?.split("/") || "No profile picture");
		const token = jwt.sign(
			{
				_id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				sentRequests: user.sentRequests,
				receivedRequests: user.receivedRequests,
				friends: user.friends,
				blocked: user.blocked,
				profilePictureUrl: user.profilePictureUrl || "",
			},
			process.env.JWT_SECRET,
			{
				expiresIn: "15m",
			}
		);

		// Generate Refresh token
		const refresh = jwt.sign(
			{ _id: user._id },
			process.env.REFRESH_JWT_SECRET,
			{
				expiresIn: "7d",
			}
		);

		// Remove password from the response
		user.password = undefined;
		console.log(user);

		// Delete all expired refresh tokens from the Database
		deleteExpiredRevokedTokens();

		// Adding JWT to a Cookie
		res.cookie("jwt", token, { httpOnly: true, same_site: "none" });
		res
			.cookie("refresh", refresh, { httpOnly: true })
			.json({ success: true, user });
	} catch (error) {
		return handleError(res, error);
	}
};

exports.logout = async (req, res) => {
	try {
		// Adding revoked JWT token to the list so that it can't be used again
		addRevokedToken(req);

		// Clearing cookies
		res.clearCookie("refresh");
		res.clearCookie("jwt").json({ success: true });
	} catch (error) {
		handleError(res, error);
	}
};

exports.getUsers = async (req, res) => {
	try {
		// Finding all users
		const users = await User.find();
		res.json(users);
	} catch (error) {
		handleError(res, error);
	}
};

exports.editUser = async (req, res) => {
	try {
		// Defining Mime Types
		const MIME_TYPES = {
			"image/jpg": "jpg",
			"image/jpeg": "jpg",
			"image/png": "png",
		};

		// Finding the user to edit
		const user = await User.findById(req.user._id);

		// Returning an error if the user doesn't exist
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		// Updating the user object
		user.email = req.body.email;

		// Checking if the request has a file
		if (req.file) {
			// Setting s3 upload parameters
			const uploadParams = {
				Bucket: "groupomaniapfp",
				Key: `${Date.now().toString()}.${MIME_TYPES[req.file.mimetype]}`,
				Body: req.file.buffer,
				ContentType: `image/${MIME_TYPES[req.file.mimetype]}`,
				ContentDisposition: "inline",
			};

			try {
				// Uploading the file to s3
				const data = await s3.upload(uploadParams).promise();
				console.log("Successfully uploaded profile picture to S3: ", data);

				// Checking if the user had a profile picture before and deleting it if so
				if (user.profilePictureUrl) {
					await s3
						.deleteObject({
							Bucket: "groupomaniapfp",
							Key: user.profilePictureUrl.split("/")[3],
						})
						.promise();
				}

				// Setting the new profile picture url
				user.profilePictureUrl = data.Location;
			} catch (err) {
				console.error("Error uploading file to S3: ", err);
				return res.status(500).json({
					error: "Failed to upload profile picture to S3",
					message: err,
				});
			}
		}

		// Updating the user in the database
		await User.updateOne({ _id: user._id }, user);

		// Removing the password from the returned user object
		user.password = undefined;

		// Returning the updated user object
		res.status(200).json({ user });
	} catch (error) {
		if (error.code === 11000) {
			res.status(400).json({ error: "Email is already taken." });
		} else {
			handleError(res, error);
		}
	}
};

exports.deleteUser = async (req, res) => {
	try {
		// Finding and deleting the user
		const user = await User.findByIdAndDelete(req.user._id);
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		if (user?.profilePictureUrl) {
			await s3
				.deleteObject({
					Bucket: "groupomaniapfp",
					Key: user?.profilePictureUrl?.split("/")[3],
				})
				.promise();
		}

		// Deleting the user's posts
		await Post.deleteMany({ authorId: req.user._id });

		// Clearing the JWT cookies from the browser
		res.clearCookie("refresh");
		res.clearCookie("jwt").json({ success: true });
	} catch (error) {
		handleError(res, error);
	}
};

exports.getPosts = async (req, res) => {
	try {
		// Finding all of one user's posts
		const posts = await Post.find({ authorId: req.params.id });
		res.json(posts);
	} catch (error) {
		handleError(res, error);
	}
};

exports.refresh = async (req, res) => {
	try {
		// Getting the refresh token from the cookie
		const refreshToken = req.cookies["refresh"];

		// Checking if the refresh token is revoked
		const isRevoked = await RevokedToken.findOne({ token: refreshToken });
		if (isRevoked) {
			return res.status(401).json({ error: "Refresh token Revoked!" });
		}

		// Finding the user from the refresh token
		const user = await User.findById(req.user._id);
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		// Generating a new JWT session token
		const token = jwt.sign(
			{ id: user._id, username: user.username },
			process.env.JWT_SECRET,
			{
				expiresIn: "1m",
			}
		);

		// Assigning the token to a cookie in the response
		res.cookie("jwt", token, { httpOnly: true }).json({ success: true });
	} catch (error) {
		handleError(res, error);
	}
};

exports.persist = async (req, res) => {
	try {
		// Finding the user from the refresh token
		const user = await User.findById(req.user._id);
		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		// Updating the last login time of the user
		user.lastLogin = Date.now();
		await User.updateOne({ _id: req.user.id }, user);

		// Removing the password from the response
		user.password = undefined;

		res.json({ user });
	} catch (error) {
		handleError(res, error);
	}
};

exports.sendFriendRequest = async (req, res) => {
	try {
		// Finding both the user and the recipient
		const user = await User.findById(req.user._id);
		const recipient = await User.findById(req.body.recipientId);

		// Returning an error if neither the user nor the recipient exist
		if (!user || !recipient) {
			return res.status(404).json({ error: "User or recipient not found." });
		}

		// Returning an error if the user is blocked by the recipient
		if (recipient.blocked.includes(user)) {
			return res.status(403).json({ error: "User is blocked." });
		}

		// Returning an error if the user and recipient are already friends
		if (
			recipient.friends.findIndex(
				(friend) => friend.senderId == user._id.toString()
			) !== -1
		) {
			return res.status(403).json({ error: "User is already friends." });
		}

		// Returning an error if the user has already sent a friend request to the recipient
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

		// Making the user and recipient friends if the recipient has already sent a friend request to the user
		if (
			recipient.sentRequests.findIndex(
				(request) => request.recipientId == user._id.toString()
			) !== -1
		) {
			// Removing the friend request from the recipient's sentRequests array
			recipient.sentRequests = recipient.sentRequests.filter(
				(request) => request.recipientId !== user._id.toString()
			);

			// Removing the friend request from the user's receivedRequests array
			user.receivedRequests = user.receivedRequests.filter(
				(request) => request.senderId !== recipient._id.toString()
			);

			// Adding the friend to the user's friends array
			user.friends.push({
				senderId: recipient._id.toString(),
				senderName: recipient.username,
				date: new Date().toLocaleDateString(),
			});

			// Adding the friend to the recipient's friends array
			recipient.friends.push({
				senderId: user._id.toString(),
				senderName: user.username,
				date: new Date().toLocaleDateString(),
			});

			// Updating the Database
			await User.updateOne({ _id: user._id }, user);
			await User.updateOne({ _id: req.body.recipientId }, recipient);

			return res.status(200).json({
				request: {
					senderId: recipient._id,
					senderName: recipient.username,
					date: new Date().toLocaleDateString(),
				},
				// The friend type tells redux how to handle the response
				type: "friend",
			});
		}

		// If none of the previous conditions apply \/\/\/

		// The request gets added to the user's sentRequests array
		user.sentRequests.push(req.body);

		// The request gets added to the recipient's receivedRequests array
		recipient.receivedRequests.push(req.body);

		// Updating the Database
		await User.updateOne({ _id: user._id }, user);
		await User.updateOne({ _id: req.body.recipientId }, recipient);

		res.status(201).json({
			request: {
				senderId: recipient._id,
				senderName: recipient.username,
				date: new Date().toLocaleDateString(),
			},
			// The sent type tells redux how to handle the response
			type: "sent",
		});
	} catch (error) {
		handleError(res, error);
	}
};

exports.denyFriendRequest = async (req, res) => {
	try {
		// Finding both the user and the sender
		const user = await User.findById(req.user._id);
		const sender = await User.findById(req.body.senderId);

		// Returning an error if neither the user nor the sender exist
		if (!user || !sender) {
			return res.status(404).json({ error: "User or sender not found." });
		}

		// Removing the request from the user's receivedRequests array
		user.receivedRequests.filter(
			(request) => request.senderId !== req.body.senderId
		);

		// Removing the request from the recipient's sentRequests array
		sender.sentRequests.filter(
			(request) => request.recipientId !== req.body.recipientId
		);

		// Updating the Database
		await User.updateOne({ _id: req.user.id }, user);
		await User.updateOne({ _id: req.body.senderId }, sender);

		res.status(200).json(req.body);
	} catch (error) {
		handleError(res, error);
	}
};

exports.acceptFriendRequest = async (req, res) => {
	try {
		// Finding both the user and the sender
		const user = await User.findById(req.user._id);
		const sender = await User.findById(req.body.senderId);

		// Returning an error if neither the user nor the sender exist
		if (!user || !sender) {
			return res.status(404).json({ error: "User or sender not found." });
		}

		// Removing the request from the user's receivedRequests array
		user.receivedRequests.filter(
			(request) => request.senderId !== req.body.senderId
		);

		// Removing the request from the sender's sentRequests array
		sender.sentRequests.filter(
			(request) => request.recipientId !== req.body.recipientId
		);

		// Adding the friend to the user's friends array
		user.friends.push({
			senderId: sender._id.toString(),
			senderName: sender.username,
			date: new Date().toLocaleDateString(),
		});

		// Adding the friend to the sender's friends array
		sender.friends.push({
			senderId: user._id.toString(),
			senderName: user.username,
			date: new Date().toLocaleDateString(),
		});

		// Updating the Database
		await User.updateOne({ _id: user._id }, user);
		await User.updateOne({ _id: req.body.senderId }, sender);

		res.status(200).json(req.body);
	} catch (error) {
		handleError(res, error);
	}
};

exports.block = async (req, res) => {
	try {
		// Finding both the user and the recipient
		const user = await User.findById(req.user._id);
		const recipient = await User.findById(req.body.recipientId);

		// Returning an error if neither the user nor the recipient exist
		if (!user || !recipient) {
			return res.status(404).json({ error: "User or recipient not found." });
		}

		// Returning an error if the recipient is already blocked
		if (user.blocked.includes(recipient._id)) {
			return res.status(403).json({ error: "User is already blocked." });
		}

		if (
			user.friends.findIndex((friend) => friend.senderId === recipient._id) !==
			-1
		) {
			// Removing the friend from the user's friends array
			user.friends = user.friends.filter(
				(friend) => friend.senderId !== recipient._id
			);

			// Removing the friend from the recipient's friends array
			recipient.friends = recipient.friends.filter(
				(friend) => friend.senderId !== user._id
			);

			// Updating the Database
			await User.updateOne({ _id: req.body.recipientId }, recipient);
		}

		// Adding the recipient to the user's blocked array
		user.blocked.push(recipient._id);

		// Updating the Database
		await User.updateOne({ _id: user._id }, user);

		res.status(200).json(req.body);
	} catch (error) {
		handleError(res, error);
	}
};
