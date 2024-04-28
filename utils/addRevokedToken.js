require("express");
require("cookie-parser");
const RevokedToken = require("../models/revokedToken");

exports.addRevokedToken = async (req) => {
	console.log(req.cookies);

	const refreshToken = req.cookies["refresh"];
	if (!refreshToken) {
		console.log("No refresh token");
	}

	try {
		const token = new RevokedToken({ token: refreshToken });
		await token.save();
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error." });
	}
};
