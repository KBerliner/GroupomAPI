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

exports.editPost = async (req, res) => {};

exports.deletePost = async (req, res) => {};

exports.getAllPosts = async (req, res) => {};
