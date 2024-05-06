// Installing Dependencies

const http = require("http");
const app = require("./app");

const { Server } = require("socket.io");

// Assigning a port

const normalizePort = (val) => {
	const port = parseInt(val, 10);

	if (isNaN(port)) {
		return val;
	}
	if (port >= 0) {
		return port;
	}
	return false;
};
const port = normalizePort(process.env.PORT || "3123");
app.set("port", port);

const errorHandler = (error) => {
	if (error.syscall !== "listen") {
		throw error;
	}
	const address = server.address();
	const bind =
		typeof address === "string" ? "pipe " + address : "port: " + port;
	switch (error.code) {
		case "EACCES":
			console.error(bind + " requires elevated privileges.");
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(bind + " is already in use.");
			process.exit(1);
			break;
		default:
			throw error;
	}
};

// Creating a server

const server = http.createServer(app);

// Error Handling

server.on("error", errorHandler);
server.on("listening", () => {
	const address = server.address();
	const bind = typeof address === "string" ? "pipe " + address : "port " + port;
	console.log("Listening on " + bind);
});

// Settup up a Web Socket

const io = new Server(server, {
	cors: {
		origin: "http://localhost:5173",
		methods: ["GET", "POST"],
		credentials: true,
	},
});

const onlineUsers = new Set();
const userSockets = {};

io.on("connection", (socket) => {
	// Add user to online users set
	socket.on("addUser", (userId) => {
		userSockets[userId] = socket.id;
		onlineUsers.add(userId);
		io.emit("onlineUsers", Array.from(onlineUsers));
		console.log("User Added: ", userId);
	});

	// Handle a Friend Request
	socket.on(
		"friendRequest",
		({ senderId, recipientId, senderName, senderPfp }) => {
			const recipientSocketId = userSockets[recipientId];
			console.log(senderName, recipientSocketId);
			if (recipientSocketId) {
				io.to(recipientSocketId).emit("receivedFriendRequest", {
					senderPfp,
					senderId,
					senderName,
					date: new Date().toLocaleTimeString(),
				});
			}
		}
	);

	// Handling a Denied Friend Request
	socket.on("friendRequestDeny", ({ senderId, recipientId }) => {
		const recipientSocketId = userSockets[recipientId];
		if (recipientSocketId) {
			io.to(recipientSocketId).emit("deniedFriendRequest", {
				senderId,
				senderName,
			});
		}
	});

	// Handling an Accepted Friend Request
	socket.on(
		"friendRequestAccept",
		({ senderId, recipientId, senderName, senderPfp }) => {
			const recipientSocketId = userSockets[recipientId];
			if (recipientSocketId) {
				io.to(recipientSocketId).emit("acceptedFriendRequest", {
					senderPfp,
					senderId,
					senderName,
					date: new Date().toLocaleTimeString(),
				});
			}
		}
	);

	// When a user disconnects, remove them from the online set
	socket.on("disconnect", () => {
		onlineUsers.delete(socket.userId);
		io.emit("onlineUsers", Array.from(onlineUsers));
	});
});

// Active Server Listening

server.listen(port);
