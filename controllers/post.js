const express = require("express");
const Post = require("../models/post");
const User = require("../models/user");
const AWS = require("../utils/aws");

// Initializing S3 instance
const s3 = new AWS.S3();

exports.createPost = async (req, res) => {
	// Setting Variables
	const MIME_TYPES = {
		"image/png": "png",
		"image/jpeg": "jpeg",
		"image/jpg": "jpg",
	};
	const user = req.user;

	// Checking for file in request
	if (req.file) {
		console.log("Heres the body: ", req.body);
		const uploadParams = {
			Bucket: "groupomaniacontent",
			Key: `${Date.now().toString()}.${MIME_TYPES[req.file.mimetype]}`,
			Body: req.file.buffer,
			ContentType: `image/${MIME_TYPES[req.file.mimetype]}`,
			ContentDisposition: "inline",
		};

		s3.upload(uploadParams, async (err, data) => {
			if (err) {
				console.error("Error uploading file to S3: ", err);
				res.status(500).json({
					error: "Failed to upload content to S3",
					message: err,
				});
			} else {
				console.log("Successfully uploaded content to S3: ", data);

				// Adding the content URL to the post object
				try {
					const post = new Post({
						author: user.username,
						authorId: user._id,
						authorPFP: user?.profilePictureUrl || null,
						imageUrl: data.Location,
						...req.body,
					});
					await post.save();
					res.status(201).json({ post });
				} catch (error) {
					console.error(error);
					res.status(500).json({ error: "Internal server error." });
				}
			}
		});
	} else {
		try {
			const post = new Post({
				author: user.username,
				authorId: user._id,
				authorPFP: user?.profilePictureUrl || null,
				...req.body,
			});

			await post.save();
			res.status(201).json({ post });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Internal server error." });
		}
	}
};

exports.editPost = async (req, res) => {
	try {
		const user = req.user.user;
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}
		if (post.authorId !== user._id) {
			return res.status(401).json({ error: "Unauthorized." });
		}
		post.title = req.body.title;
		post.caption = req.body.caption;
		post.imageUrl = req.body?.imageUrl;
		post.likesEnabled = req.body.likesEnabled;
		post.lastUpdated = Date.now();
		await post.save();
		res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.deletePost = async (req, res) => {
	try {
		const user = req.user.user;
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}
		if (post.authorId !== user._id) {
			return res.status(401).json({ error: "Unauthorized." });
		}
		await Post.deleteOne(post);
		res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.likePost = async (req, res) => {
	try {
		const user = req.user.user;
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}

		if (!post.likesEnabled) {
			return res
				.status(400)
				.json({ error: "Likes are not enabled on this post." });
		} else if (post.usersLiked.includes(user._id)) {
			post.likes -= 1;
			post.usersLiked.splice(post.usersLiked.indexOf(user._id), 1);
		} else if (post.usersDisliked.includes(user._id)) {
			post.dislikes -= 1;
			post.usersDisliked.splice(post.usersDisliked.indexOf(user._id), 1);
			post.likes += 1;
			post.usersLiked.push(user._id);
		} else {
			post.likes += 1;
			post.usersLiked.push(user._id);
		}

		await Post.updateOne({ _id: post._id }, post);
		res
			.status(200)
			.json({ id: post._id, likes: post.likes, dislikes: post.dislikes });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.dislikePost = async (req, res) => {
	try {
		const user = req.user.user;
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}

		if (!post.likesEnabled) {
			return res
				.status(400)
				.json({ error: "Likes are not enabled on this post." });
		} else if (post.usersDisliked.includes(user._id)) {
			post.dislikes -= 1;
			post.usersDisliked.splice(post.usersDisliked.indexOf(user._id), 1);
		} else if (post.usersLiked.includes(user._id)) {
			post.likes -= 1;
			post.usersLiked.splice(post.usersLiked.indexOf(user._id), 1);
			console.log("USERS DISLIKED: ", post.usersLiked.includes(user._id));
			post.dislikes += 1;
			post.usersDisliked.push(user._id);
		} else {
			post.dislikes += 1;
			post.usersDisliked.push(user._id);
		}

		await Post.updateOne({ _id: post._id }, post);
		res
			.status(200)
			.json({ id: post._id, likes: post.likes, dislikes: post.dislikes });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.viewPost = async (req, res) => {
	try {
		const user = req.user.user;
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}

		if (post.usersSeen.includes(user._id)) {
			return res.status(400).json({ error: "You've already seen this post. " });
		}

		post.usersSeen.push(user._id);

		await post.save();
		res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.getAllPosts = async (req, res) => {
	try {
		const posts = await Post.find();
		res.status(200).json(posts);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error });
	}
};
