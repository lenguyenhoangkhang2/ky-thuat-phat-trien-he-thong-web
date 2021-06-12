const express = require("express");
const { body } = require("express-validator");

const userController = require("../controllers/user");
const { isAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/profile", isAuth, userController.getProfile);

router.post(
  "/user/contact",
  [
    body("country").isString().not().isEmpty().withMessage("Không bỏ trống thông tin"),
    body("province").isString().not().isEmpty().withMessage("Không bỏ trống thông tin"),
    body("district").isString().not().isEmpty().withMessage("Không bỏ trống thông tin"),
    body("detail").isString().not().isEmpty().withMessage("Không bỏ trống thông tin"),
    body("phone")
      .isNumeric()
      .withMessage("Phải nhập số điện thoại")
      .isLength({ max: 13 })
      .withMessage("Số điện thoại quá dài")
      .not()
      .isEmpty()
      .withMessage("Không bỏ trống thông tin")
      .trim(),
  ],
  isAuth,
  userController.updateContact
);

module.exports = router;
