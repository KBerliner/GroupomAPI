const express = require("express");
const Post = require("../models/post");

exports.createPost = async (req, res) => {
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

exports.getAllPosts = async (req, res) => {};
