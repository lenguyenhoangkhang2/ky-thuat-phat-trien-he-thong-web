const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const { isGuest } = require("../middleware/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", isGuest, authController.getLogin);

router.get("/signup", isGuest, authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
    body("password", "Password has to be valid.")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  [
    body("name").not().isEmpty().withMessage("Nhập tên của bạn"),
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        // if (value === "hoangkhang887@gmail.com") {
        //   throw new Error("This email address if forbidden.");
        // }
        // return true;
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-mail exists already, please pick a different one");
          }
        });
      })
      .normalizeEmail(),
    body("password", "Mật khẩu yêu cầu chữ cái hoặc số, ít nhất 5 ký tự")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      })
      .trim(),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
