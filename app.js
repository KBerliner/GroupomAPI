// Installing Dependencies

require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const db = require("./utils/db");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/user");
const postRoutes = require("./routes/post");

// Setting up Express

app.use(express.json());

// Setting up Passport

app.use(passport.initialize());

// Setting up Cookie Parser

app.use(cookieParser());

// Connecting to Database

db();

// Setting up CORS

if (process.env.NODE_ENV) {
	app.use(
		cors({
			origin:
				"https://groupomernia-pi7qp87w1-kyles-projects-61d652f2.vercel.app/",
			credentials: true,
		})
	);
} else {
	app.use(
		cors({
			origin: "http://localhost:5173",
			credentials: true,
		})
	);
}

// Request Routing

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

// Export the app

module.exports = app;
