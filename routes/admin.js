const path = require("path");

const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const { isAdmin } = require("../middleware/auth");
const { uploadImage } = require("../middleware/upload");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAdmin, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAdmin, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  isAdmin,
  uploadImage.fields([
    { name: "official", maxCount: 1 },
    { name: "slider", maxCount: 8 },
  ]),
  [
    body("category").not().isEmpty().withMessage("Yêu cầu chọn loại sản phẩm"),
    body("name").not().isEmpty().withMessage("Yêu cầu tên sản phẩm"),
    body("price").not().isEmpty().withMessage("Yêu cầu thông tin giá sản phẩm"),
    body("quantity").not().isEmpty().withMessage("Yêu cầu số lượng sản phẩm hiện có"),
    body("brand").not().isEmpty().withMessage("Yêu cầu tên thương hiệu"),
    body("discount")
      .isFloat({ min: 0, max: 100 })
      .withMessage("Giá trị 0 < giảm giá < 100"),
    body("details").not().isEmpty().withMessage("Yêu cầu thông số chi tiết sản phẩm"),
  ],
  adminController.postAddProduct
);

router.get("/edit-header", isAdmin, adminController.getEditHeader);

router.get("/edit-header/:imageId", isAdmin, adminController.getUpdateHeaderImage);

router.post(
  "/update-header-image",
  isAdmin,
  uploadImage.single("image"),
  [
    body("linkTo").not().isEmpty().withMessage("Yêu cầu một địa chỉ liên kết cho ảnh"),
    body("type").not().isEmpty().withMessage("Yêu cầu loại ảnh"),
  ],
  adminController.updateHeaderImage
);

router.get("/orders", adminController.getOrders);

router.post("/delete-header-image", isAdmin, adminController.deleteHeaderImage);

router.post(
  "/edit-header",
  isAdmin,
  uploadImage.single("image"),
  [
    body("linkTo").not().isEmpty().withMessage("Yêu cầu một địa chỉ liên kết cho ảnh"),
    body("type").not().isEmpty().withMessage("Yêu cầu loại ảnh"),
  ],
  adminController.addHeaderImage
);

router.get("/edit-product/:productId", isAdmin, adminController.getEditProduct);

router.post(
  "/edit-product",
  isAdmin,
  uploadImage.fields([
    { name: "official", maxCount: 1 },
    { name: "slider", maxCount: 8 },
  ]),
  [
    body("category").not().isEmpty().withMessage("Yêu cầu chọn loại sản phẩm"),
    body("name").not().isEmpty().withMessage("Yêu cầu tên sản phẩm"),
    body("price").not().isEmpty().withMessage("Yêu cầu thông tin giá sản phẩm"),
    body("quantity").not().isEmpty().withMessage("Yêu cầu số lượng sản phẩm hiện có"),
    body("brand").not().isEmpty().withMessage("Yêu cầu tên thương hiệu"),
    body("discount")
      .isFloat({ min: 0, max: 100 })
      .withMessage("Giá trị 0 < giảm giá < 100"),
    body("details").not().isEmpty().withMessage("Yêu cầu thông số chi tiết sản phẩm"),
  ],
  adminController.postEditProduct
);

router.delete("/product/:productId", isAdmin, adminController.deleteProduct);

module.exports = router;
