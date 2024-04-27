// Installing Dependencies

const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../middleware/jwt");
require("dotenv").config();

const postCtrl = require("../controllers/post");

// Routing Endpoints

// Exporting Routes

module.exports = router;
