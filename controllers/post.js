// Installing Dependencies

const mongoose = require("mongoose");

// Creating a blueprint for the "Post" object

const postSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	author: {
		type: String,
		required: true,
	},
	authorId: {
		type: String,
		required: true,
	},
	caption: {
		type: String,
		required: true,
	},
	likes: {
		type: Number,
		default: 0,
	},
	dislikes: {
		type: Number,
		default: 0,
	},
	usersLiked: {
		type: Array,
		default: [],
	},
	usersDisliked: {
		type: Array,
		default: [],
	},
	usersSeen: {
		type: Array,
		default: [],
	},
	imageUrl: { type: String },
	likesEnabled: {
		type: Boolean,
		default: true,
		required: true,
	},
	created: { type: Date, default: Date.now },
	lastUpdated: { type: Date, default: Date.now },
});

// Exporting the Post Blueprint

module.exports = mongoose.model("Post", postSchema);
