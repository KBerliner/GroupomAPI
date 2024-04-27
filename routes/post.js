// Installing Dependencies

const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../middleware/jwt");
require("dotenv").config();

const postCtrl = require("../controllers/post");

// Routing Endpoints

router.post(
	"/",
	passport.authenticate("jwt", { session: false }),
	postCtrl.createPost
);

router.put(
	"/update/:id",
	passport.authenticate("jwt", { session: false }),
	postCtrl.editPost
);

router.delete(
	"/delete/:id",
	passport.authenticate("jwt", { session: false }),
	postCtrl.deletePost
);

router.get("/", postCtrl.getAllPosts);

// Exporting Routes

module.exports = router;
