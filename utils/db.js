require("dotenv").config();

const uri = `mongodb+srv://berlinerkyle:${process.env.MONGODB_PASSWORD}@groupomania.eseni6r.mongodb.net/?retryWrites=true&w=majority&appName=Groupomania`;

const mongoose = require("mongoose");

const run = () => {
	mongoose
		.connect(uri)
		.then(() => {
			console.log("MongoDB Connected!");
		})
		.catch((err) => {
			console.error(err);
		});
};

module.exports = run;
