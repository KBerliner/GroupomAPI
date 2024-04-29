// Installing Dependencies

const multer = require("multer");

console.log("Multer middleware has been activated.");

// File Extension Possibilites

const MIME_TYPES = {
	"image/jpg": "jpg",
	"image/jpeg": "jpg",
	"image/png": "png",
};

// Saving Images

const storage = multer.memoryStorage();

// Exporting the image saving function

module.exports = multer({ storage }).single("file");
