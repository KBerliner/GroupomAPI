// Installing Dependencies

const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../middleware/jwt");
require("dotenv").config();

const userCtrl = require("../controllers/user");

// Routing Endpoints

router.post("/signup", userCtrl.signup);
router.post("/login", userCtrl.login);
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

// Exporting Routes

module.exports = router;
