// Installing Dependencies

const express = require("express");
const router = express.Router();
const passport = require("passport");
const multer = require("../middleware/multer-config");
require("../middleware/jwt");
require("../middleware/refresh");
require("dotenv").config();

const userCtrl = require("../controllers/user");

// Routing Endpoints

// TEMPORARY DELETE ALL ROUTE FOR DEVELOPMENT
const User = require("../models/user");
router.delete("/all", (req, res) => {
	try {
		User.deleteMany({}).then((err) => {
			if (err) return res.status(500).send(err);
			res.status(200).send("All users deleted");
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error." });
	}
});

router.post("/signup", multer, userCtrl.signup);
router.post("/login", userCtrl.login);
router.post(
	"/logout",
	passport.authenticate("jwt", { session: false }),
	userCtrl.logout
);
router.get(
	"/",
	passport.authenticate("jwt", { session: false }),
	userCtrl.getUsers
);

router.put(
	"/",
	passport.authenticate("jwt", { session: false }),
	multer,
	userCtrl.editUser
);

router.delete(
	"/",
	passport.authenticate("jwt", { session: false }),
	userCtrl.deleteUser
);
router.post(
	"/refresh",
	passport.authenticate("refresh", { session: false }),
	userCtrl.refresh
);

router.get("/posts/:id", userCtrl.getPosts);

router.get(
	"/persist",
	passport.authenticate("jwt", { session: false }),
	userCtrl.persist
);

router.put(
	"/sendFriendRequest",
	passport.authenticate("jwt", { session: false }),
	userCtrl.sendFriendRequest
);

router.put(
	"/denyFriendRequest",
	passport.authenticate("jwt", { session: false }),
	userCtrl.denyFriendRequest
);

router.put(
	"/acceptFriendRequest",
	passport.authenticate("jwt", { session: false }),
	userCtrl.acceptFriendRequest
);

router.put(
	"/block",
	passport.authenticate("jwt", { session: false }),
	userCtrl.block
);

router.options("/*", (req, res) => {
	res.header("Access-Control-Allow-Origin", "https://groupomernia.vercel.app");
	res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
	res.sendStatus(200);
});

// Exporting Routes

module.exports = router;
