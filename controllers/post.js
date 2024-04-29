const express = require("express");
const Post = require("../models/post");
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

	// Checking for file in request
	if (req.file) {
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
						author: req.user.username,
						authorId: req.user.id,
						imageUrl: data.Location,
						...req.body,
					});
					await post.save();
					res.status(201).json({ success: true });
				} catch (error) {
					console.error(error);
					res.status(500).json({ error: "Internal server error." });
				}
			}
		});
	} else {
		try {
			const post = new Post({
				author: req.user.username,
				authorId: req.user.id,
				...req.body,
			});
			await post.save();
			res.status(201).json({ success: true });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Internal server error." });
		}
	}
};

exports.editPost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}
		if (post.authorId !== req.user.id) {
			return res.status(401).json({ error: "Unauthorized." });
		}
		post.title = req.body.title;
		post.caption = req.body.caption;
		post.imageUrl = req.body?.imageUrl;
		post.likesEnabled = req.body.likesEnabled;
		await post.save();
		res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};

exports.deletePost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found." });
		}
		if (post.authorId !== req.user.id) {
			return res.status(401).json({ error: "Unauthorized." });
		}
		await Post.deleteOne(post);
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
		res.status(500).json({ error: "Internal server error." });
	}
};
