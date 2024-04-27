// Installing Dependencies

const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../middleware/jwt");
require("../middleware/refresh");
require("dotenv").config();

const userCtrl = require("../controllers/user");

// Routing Endpoints

router.post("/signup", userCtrl.signup);
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

// Exporting Routes

module.exports = router;
