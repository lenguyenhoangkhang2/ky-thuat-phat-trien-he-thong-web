const fs = require("fs");
const path = require("path");
const pdfDocument = require("pdfkit");
const queryString = require("query-string");
const stripe = require("stripe")(
  "sk_test_51IjzZzI46iToXABs6pgoDEDMuGhGIW1hHMR21Ucg6XINESSCnMg7tIcqaw81g51TMJmndS8Su6rW0hwTHX1stneC00swRs3LDD"
);

const Product = require("../models/product");
const Order = require("../models/order");
const HeaderImage = require("../models/headerImage");

const ITEM_PER_PAGE = 2;

exports.getProducts = async (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  const page = +req.query.page || 1;
  const name = req.query.n ? new RegExp(`.*${req.query.n}.*`, "i") : /.*/;
  const category = req.query.c || /.*/;
  const brand = req.query.b || /.*/;

  const minPrice = req.query.p ? JSON.parse(req.query.p).min : 0;
  let maxPrice = req.query.p ? JSON.parse(req.query.p).max : Infinity;
  if (maxPrice === "Infinity") {
    maxPrice = Infinity;
  }

  let sortBy = {
    createdAt: -1,
  };

  switch (req.query.s) {
    case "new":
      sortBy = {
        createdAt: -1,
      };
      break;
    case "priceAsc":
      sortBy = {
        price: 1,
      };
      break;
    case "priceDesc":
      sortBy = {
        price: -1,
      };
      break;
    case "discount":
      sortBy = {
        discount: -1,
      };
      break;
    default:
      break;
  }

  let query = "";
  if (req.query.n || req.query.c || req.query.b || req.query.s || req.query.p) {
    query = queryString.stringify({
      n: req.query.n,
      c: req.query.c,
      b: req.query.b,
      s: req.query.s,
      p: req.query.p,
    });
  }

  try {
    const allProducts = await Product.find();

    const allProductsWithFilter = await Product.aggregate()
      .addFields({
        priceWithDiscount: {
          $cond: {
            if: {
              $eq: ["$discount", 0],
            },
            then: "$price",
            else: {
              $round: [
                {
                  $multiply: [
                    "$price",
                    {
                      $subtract: [
                        1,
                        {
                          $divide: ["$discount", 100],
                        },
                      ],
                    },
                  ],
                },
                -4,
              ],
            },
          },
        },
      })
      .match({
        name: name,
        brand: brand,
        category: category,
        priceWithDiscount: { $gte: minPrice, $lte: maxPrice },
      });

    const productPage = await Product.aggregate()
      .addFields({
        priceWithDiscount: {
          $cond: {
            if: {
              $eq: ["$discount", 0],
            },
            then: "$price",
            else: {
              $round: [
                {
                  $multiply: [
                    "$price",
                    {
                      $subtract: [
                        1,
                        {
                          $divide: ["$discount", 100],
                        },
                      ],
                    },
                  ],
                },
                -4,
              ],
            },
          },
        },
        avgRating: {
          $divide: [
            {
              $round: [{ $multiply: [{ $avg: "$reviews.rating" }, 2] }, 0],
            },
            2,
          ],
        },
      })
      .match({
        name: name,
        brand: brand,
        category: category,
        priceWithDiscount: { $gte: minPrice, $lte: maxPrice },
      })
      .sort(sortBy)
      .skip((page - 1) * ITEM_PER_PAGE)
      .limit(ITEM_PER_PAGE);

    res.render("shop/product-list", {
      allProduct: allProducts,
      prods: productPage,
      pageTitle: "Products",
      path: "/products",
      query: query,
      filter: query ? queryString.parse(query) : "",
      currentPage: page,
      errorMessage: message,
      totalItems: allProductsWithFilter.length,
      itemPerPage: ITEM_PER_PAGE,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    const product = await Product.findById(prodId).populate({
      path: "reviews",
      populate: {
        path: "owner",
        model: "User",
      },
    });
    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.title,
      path: "/products",
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postProductReview = async (req, res, next) => {
  const productId = req.params.productId;
  const rating = +req.body.rating;
  const comment = req.body.comment;

  try {
    const product = await Product.findById(productId);
    product.reviews.push({
      owner: req.user,
      comment: comment,
      rating: rating,
    });

    await product.save();

    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.name,
      path: "/products",
    });
  } catch (error) {
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    const slider = await HeaderImage.find({
      active: true,
      type: "slider",
    });

    const banner = await HeaderImage.find({
      active: true,
      type: "banner",
    });

    const smartphone = await Product.find({
      category: "Điện thoại",
    }).limit(8);

    const laptop = await Product.find({
      category: "Laptop",
    }).limit(8);

    res.render("shop/index", {
      smartphone: smartphone,
      laptop: laptop,
      pageTitle: "Shop",
      path: "/",
      slider: slider,
      banner: banner,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    const product = await Product.findById(prodId);
    await req.user.addToCart(product);
    res.redirect("/cart");
  } catch (err) {
    if ((err.message = "Sản phẩm đã có trong giỏ hàng")) {
      req.flash("error", err.message);
      return res.redirect("/products");
    }

    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.updateCartQuantity = async (req, res, next) => {
  const productId = req.body.productId;
  const quantity = req.body.quantity;

  const product = await Product.findById(productId);

  try {
    await req.user.updatedCartItemQuantity(product, quantity);
    res.status(200).end();
  } catch (error) {
    res.status(400).send({ errorMessage: error.message });
  }
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.orderCod = async (req, res, next) => {
  try {
    const { country, province, district, detail, phone } = req.user.contact;
    await req.user.populate("cart.items.productId").execPopulate();
    const cartItems = req.user.cart.items;

    if (!country || !province || !district || !detail || !phone) {
      const session = await createStripeSession();
      return res.render("shop/checkout", {
        path: "/checkout",
        hasError: true,
        contact: req.user.contact,
        errorMessage: "Thông tin liên lạc còn thiếu, vui lòng bổ sung",
        pageTitle: "Your Cart",
        hasErrorUpdateContact: false,
        products: cartItems,
        stripeSessionId: session.id,
      });
    }

    let total = 0;
    const orderItems = cartItems.map((i) => {
      total += i.quantity * i.productId.getPriceWithDiscount();
      return {
        quantity: i.quantity,
        product: {
          productId: i.productId._id,
          name: i.productId.name,
          imageUrl: i.productId.imageUrl.official,
          price: i.productId.getPriceWithDiscount(),
          discount: i.productId.discount,
        },
      };
    });

    const order = new Order({
      products: orderItems,
      status: "Chờ xác nhận",
      method: "Cod",
      total: total,
      user: {
        address: `${detail}, ${district}, ${province}, ${country}`,
        userId: req.user,
      },
    });

    await order.save();
    await req.user.clearCart();

    res.redirect("/orders");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCheckout = async (req, res, next) => {
  try {
    await req.user.populate("cart.items.productId").execPopulate();
    const products = req.user.cart.items;
    const total = products.reduce((total, p) => {
      return total + p.quantity * p.productId.price;
    }, 0);

    res.render("shop/checkout", {
      path: "/checkout",
      pageTitle: "Checkout",
      hasError: false,
      contact: req.user.contact,
      errorMessage: null,
      products: products,
      total: total,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.user._id }).populate(
      "user.userId"
    );
    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders: orders,
      error: null,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.cancelOrderOwner = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findOne({ _id: orderId, "user.userId": req.user._id });
    if (order) {
      if (["Đã hủy", "Đã nhận"].includes(order.status)) {
        const error = {
          message:
            order.status === "Đã hủy"
              ? "Đơn hàng đã hủy trước đó"
              : "Không thể thực hiện hủy với đơn hàng đã nhận",
          orderId: orderId,
        };

        const orders = await Order.find({ "user.userId": req.user._id });
        return res.render("shop/orders", {
          path: "/orders",
          pageTitle: "Your Orders",
          orders: orders,
          error: error,
        });
      }

      await order.populate("products.product.productId").execPopulate();
      order.status = "Đã hủy";
      for await (const p of order.products) {
        const product = p.product.productId;
        product.quantity += p.quantity;
        product.save();
      }

      await order.save();
      return res.status(200).redirect("/orders");
    }
    res.status(404).redirect("/orders");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found!"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new pdfDocument({ size: "A5" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename='" + invoiceName + "'");

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      let totalPrice = 0;

      pdfDoc.font("Times-Roman").fontSize(26).text("INVOICE", {
        underline: true,
      });

      order.products.forEach((item) => {
        totalPrice += item.product.price * item.quantity;
        pdfDoc
          .font("Times-Roman")
          .fontSize(12)
          .text(
            item.product.name + " - " + item.quantity + " x " + item.product.price + "đ"
          );
      });

      pdfDoc.fontSize(20).text("Total: " + totalPrice);

      pdfDoc.end();
    })
    .catch((err) => {
      return next(err);
    });
};
