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

router.post(
	"/sendFriendRequest",
	passport.authenticate("jwt", { session: false }),
	userCtrl.sendFriendRequest
);

router.post(
	"/denyFriendRequest",
	passport.authenticate("jwt", { session: false }),
	userCtrl.denyFriendRequest
);

router.post(
	"/acceptFriendRequest",
	passport.authenticate("jwt", { session: false }),
	userCtrl.acceptFriendRequest
);

router.post(
	"/block",
	passport.authenticate("jwt", { session: false }),
	userCtrl.block
);

// TODO: Add an "Edit Account" route

// Exporting Routes

module.exports = router;
