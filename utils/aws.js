require("dotenv").config();

// Import the AWS SDK for Node.js
const AWS = require("aws-sdk");

// Configure the AWS SDK with your credentials and region
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
});

// Export the AWS SDK
module.exports = AWS;
