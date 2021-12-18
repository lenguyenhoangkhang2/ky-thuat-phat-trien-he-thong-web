const GoogleStrategy = require("passport-google-oauth20").Strategy;
const generatorPW = require("generate-password");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

const generatePW = async () => {
  let generatedPW = generatorPW.generate({
    length: 8,
    numbers: true,
  });

  console.log("generated password", generatedPW);
  generatedPW = await bcrypt.hash(generatedPW, 12);

  return generatedPW;
};

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://localhost:3000/oauth2/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let userByGoogleId = await User.findOne({ googleId: profile.id });
          if (userByGoogleId) {
            return done(null, userByGoogleId);
          } else {
            let userByEmail = await User.findOne({
              email: profile.emails[0].value,
            });

            if (userByEmail) {
              if (!userByEmail.googleId) {
                userByEmail.googleId = profile.id;
              }
              if (!userByEmail.avatar) {
                userByEmail.avatar = profile.photos[0].value;
              }
              if (!userByEmail.password) {
                userByEmail.password = await generatePW();
              }
              if (!userByEmail.emailVerified) {
                userByEmail.emailVerified = true;
              }
              await userByEmail.save();
              return done(null, userByEmail);
            } else {
              const password = await generatePW();

              const newUser = await User.create({
                google_id: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos[0].value,
                password: password,
                role: ["user"],
                emailVerified: true,
              });
              return done(null, newUser);
            }
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      console.log(error);
    }
  });
};
