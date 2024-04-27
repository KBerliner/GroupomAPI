const passport = require("passport");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
require("dotenv").config();

const cookieExtractor = (req) => {
	let jwt = null;

	if (req && req.cookies) {
		jwt = req.cookies["refresh"];
	}

	return jwt;
};

passport.use(
	"refresh",
	new JWTStrategy(
		{
			jwtFromRequest: cookieExtractor,
			secretOrKey: process.env.REFRESH_JWT_SECRET,
		},
		(jwtPayload, done) => {
			done(null, jwtPayload);
		}
	)
);
