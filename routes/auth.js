const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth");
const { isGuest } = require("../middleware/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", isGuest, authController.getLogin);

router.get("/signup", isGuest, authController.getSignup);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email không hợp lệ.").normalizeEmail(),
    body("password", "Mật khẩu yêu cầu chữ cái hoặc số, ít nhất 5 ký tự")
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
      .withMessage("Email không hợp lệ.")
      .custom((value, { req }) => {
        // if (value === "hoangkhang887@gmail.com") {
        //   throw new Error("This email address if forbidden.");
        // }
        // return true;
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-mail đã đăng ký, vui lòng chọn email khác");
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

router.post("/send-verify-user-email", authController.sendEmailVerify);

router.get("/verify-email-by-token/:token", authController.verifyUserEmailByToken);

router.post(
  "/re-send-verify-user-email",
  [
    body("email")
      .not()
      .isEmpty()
      .withMessage("Chưa nhập email")
      .isEmail()
      .withMessage("Đây không phải là email")
      .trim(),
  ],
  authController.reSendVerifyUserEmailWhenError
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getResetPassword);

router.post("/reset", authController.postResetPassword);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
