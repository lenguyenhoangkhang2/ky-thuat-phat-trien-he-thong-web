const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");
const { isAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.post("/products/reviews/:productId", shopController.postProductReview);

router.get("/cart", isAuth, shopController.getCart);

router.post("/cart", isAuth, shopController.postCart);

router.post("/cart/quantity", isAuth, express.json(), shopController.updateCartQuantity);

router.post("/cart-delete-item", isAuth, shopController.postCartDeleteProduct);

router.get("/checkout", isAuth, shopController.getCheckout);

router.get("/checkout/cod-payment", isAuth, shopController.orderCod);

router.get("/orders", isAuth, shopController.getOrders);

router.get("/orders/:orderId", isAuth, shopController.getInvoice);

router.get("/cancel-order-owner/:orderId", isAuth, shopController.cancelOrderOwner);

module.exports = router;
