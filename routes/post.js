// Installing Dependencies

const express = require("express");
const router = express.Router();
const passport = require("passport");
const multer = require("../middleware/multer-config");
require("../middleware/jwt");
require("dotenv").config();

const postCtrl = require("../controllers/post");
const Post = require("../models/post");

// Routing Endpoints

// TEMPORARY DELETE ALL ROUTE FOR DEVELOPMENT
router.delete("/", async (req, res) => {
	try {
		await Post.deleteMany({});
		res.status(200).json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
});

router.post(
	"/",
	passport.authenticate("jwt", { session: false }),
	multer,
	postCtrl.createPost
);

router.put(
	"/update/:id",
	passport.authenticate("jwt", { session: false }),
	multer,
	postCtrl.editPost
);

router.delete(
	"/delete/:id",
	passport.authenticate("jwt", { session: false }),
	postCtrl.deletePost
);

router.put(
	"/like/:id",
	passport.authenticate("jwt", { session: false }),
	postCtrl.likePost
);

router.put(
	"/dislike/:id",
	passport.authenticate("jwt", { session: false }),
	postCtrl.dislikePost
);

router.put(
	"/view/:id",
	passport.authenticate("jwt", { session: false }),
	postCtrl.viewPost
);

router.get("/", postCtrl.getAllPosts);

router.get("/:id", postCtrl.getOnePost);

router.options("/*", (req, res) => {
	res.header("Access-Control-Allow-Origin", "https://groupomernia.vercel.app");
	res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
	res.sendStatus(200);
});

// Exporting Routes

module.exports = router;
