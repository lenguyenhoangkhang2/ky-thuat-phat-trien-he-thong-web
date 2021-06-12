const express = require("express");
const passport = require("passport");

const router = express.Router();

router.get(
  "/oauth2/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/oauth2/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.isLoggedIn = true;
    res.redirect("/");
  }
);

module.exports = router;
