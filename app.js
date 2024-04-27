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

app.use(cors());

// Request Routing

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

// Export the app

module.exports = app;
