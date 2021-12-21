const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Product = require("../models/product");
const HeaderImage = require("../models/headerImage");
const { sendMail } = require("../util/mail");
const File = require("../util/file");
const User = require("../models/user");
const Order = require("../models/order");
const queryString = require("query-string");
const { path } = require("pdfkit");
const pdfDocument = require("pdfkit");
const { formatOrderList } = require("../util/formatOrder");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const name = req.body.name;
  const quantity = req.body.quantity;
  const brand = req.body.brand;
  const category = req.body.category;
  const official = req.files["official"];
  const slider = req.files["slider"];
  const price = req.body.price;
  const discount = req.body.discount;
  const description = req.body.description;
  const details = req.body.details
    .replace(/^\s*$(?=:\r\n?|\n)/gm, "")
    .split(/\r?\n/g)
    .map((i) => ({
      specKey: i.split(":")[0].trim(),
      specValue: i.split(":")[1].trim(),
    }));

  let responseErrors = [];

  validationResult(req)
    .array()
    .forEach((e) => responseErrors.push({ param: e.param, msg: e.msg }));

  if (!official) {
    responseErrors.push({
      param: "official",
      msg: "Chưa chọn ảnh cho sản phẩm hoặc ảnh sai định dạng",
    });
  }

  if (!slider) {
    responseErrors.push({
      param: "slider",
      msg: "Chưa chọn ảnh cho slide hoặc ảnh sai định dạng",
    });
  }

  if (responseErrors.length > 0) {
    if (slider.length) {
      slider.forEach(({ path }) => {
        File.deleteFile(path);
      });
    }
    if (official) {
      File.deleteFile(official.path);
    }
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        name: name,
        brand: brand,
        category: category,
        quantity: quantity,
        price: price,
        description: description,
        discount: discount,
        details: details,
      },
      validationErrors: responseErrors,
    });
  }

  const product = new Product({
    name: name,
    category: category,
    brand: brand,
    quantity: quantity,
    price: price,
    description: description,
    discount: discount,
    imageUrl: {
      official: official[0].path,
      slider: slider.map((e) => e.path),
    },
    details: details,

    userId: req.user,
  });

  product
    .save()
    .then(() => {
      res.redirect("/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }

      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: { ...product.toObject(), details: product.getDetailsString() },
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const name = req.body.name;
  const quantity = req.body.quantity;
  const brand = req.body.brand;
  const category = req.body.category;
  const official = req.files["official"] || 0;
  const slider = req.files["slider"] || 0;
  const price = req.body.price;
  const discount = req.body.discount;
  const description = req.body.description;
  const details = req.body.details;

  let responseErrors = [];

  validationResult(req)
    .array()
    .forEach((e) => responseErrors.push({ param: e.param, msg: e.msg }));

  console.log(responseErrors);

  if (responseErrors.length > 0) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        name: name,
        brand: brand,
        category: category,
        quantity: quantity,
        price: price,
        description: description,
        discount: discount,
        details: details,
      },
      validationErrors: responseErrors,
    });
  }

  try {
    const product = await Product.findById(prodId);
    product.name = name;
    product.brand = brand;
    product.category = category;
    product.quantity = quantity;
    product.price = price;
    product.description = description;
    product.discount = discount;
    product.details = details.split(/\r?\n/).map((i) => ({
      specKey: i.split(":")[0],
      specValue: i.split(":")[1],
    }));

    if (official.length > 0) {
      File.deleteFile(product.imageUrl.official);
      product.imageUrl.official = official[0].path;
    }

    if (slider.length > 0) {
      product.imageUrl.slider.forEach((oldImage) => {
        File.deleteFile(oldImage);
      });
      product.imageUrl.slider = slider.map((image) => image.path);
    }

    return product.save().then(() => {
      console.log("UPDATED PRODUCT!: \n" + product);
      res.redirect("/products");
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = async (req, res, next) => {
  const prodId = req.params.productId;

  try {
    const product = await Product.findById(prodId);

    if (!product) {
      throw new Error("Product delete not found!");
    }

    // Delete from cart
    const users = await User.find();

    for (const user of users) {
      await user.removeFromCart(prodId);
    }

    // Delete file upload
    await File.deleteFile(product.imageUrl.official);

    for (const slideImage of product.imageUrl.slider) {
      await File.deleteFile(slideImage);
    }

    // Delete product3+689
    await Product.deleteOne({ _id: prodId });

    res.redirect("/products");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getEditHeader = async (req, res, next) => {
  try {
    const images = await HeaderImage.find().sort({
      active: -1,
      createdAt: -1,
    });
    res.render("admin/edit-header", {
      headerImages: images,
      pageTitle: "Admin Header",
      path: "/admin/edit-header",
      addImageData: null,
      hasError: false,
      validationErrors: [],
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.addHeaderImage = async (req, res, next) => {
  const image = req.file;
  const linkTo = req.body.linkTo;
  const isActive = +req.body.isActive ? true : false;
  const type = req.body.type;

  let responseErrors = [];

  validationResult(req)
    .array()
    .forEach((e) => responseErrors.push({ param: e.param, msg: e.msg }));

  if (!image) {
    responseErrors.push({
      param: "image",
      msg: "Chưa chọn file ảnh",
    });
  }

  try {
    if (type === "banner" && isActive) {
      const countActiveBanner = await HeaderImage.find({
        type: "banner",
        active: true,
      }).countDocuments();

      if (countActiveBanner >= 4) {
        responseErrors.push({
          param: "type",
          msg: "Banner đã đủ 4 mục đang hiển thị",
        });
      }
    }

    if (responseErrors.length > 0) {
      if (image) {
        File.deleteFile(image.path);
      }

      const images = await HeaderImage.find();
      return res.status(422).render("admin/edit-header", {
        pageTitle: "Admin Header",
        path: "/admin/edit-header",
        hasError: true,
        headerImages: images,
        addImageData: {
          isActive: isActive,
          linkTo: linkTo,
          type: type,
        },
        validationErrors: responseErrors,
      });
    }

    const headerImage = new HeaderImage({
      type: type,
      imageUrl: image.path,
      linkTo: linkTo,
      active: isActive,
    });

    headerImage.save();
    return res.redirect("/admin/edit-header");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getUpdateHeaderImage = async (req, res, next) => {
  const imageId = req.params.imageId;

  try {
    const image = await HeaderImage.findById(imageId);
    if (!image) {
      return res.redirect("/admin/edit-header");
    }

    res.render("admin/update-header-image", {
      pageTitle: "Update Header Image",
      path: "/admin/edit-header",
      hasError: false,
      validationErrors: [],
      editing: true,
      imageData: image,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.updateHeaderImage = async (req, res, next) => {
  const imageId = req.body.imageId;
  const image = req.file;
  const linkTo = req.body.linkTo;
  const isActive = req.body.isActive === "1" ? true : false;
  const type = req.body.type;

  let responseErrors = [];

  validationResult(req)
    .array()
    .forEach((e) => responseErrors.push({ param: e.param, msg: e.msg }));

  try {
    const updatedImage = await HeaderImage.findById(imageId);
    const oldImagePath = updatedImage.imageUrl;

    if (image) {
      updatedImage.imageUrl = image.path;
    }
    updatedImage.linkTo = linkTo;
    updatedImage.active = isActive;
    updatedImage.type = type;

    if (type === "banner" && isActive) {
      const countActiveBanner = await HeaderImage.find({
        type: "banner",
        active: true,
      }).countDocuments();

      if (countActiveBanner >= 4) {
        responseErrors.push({
          param: "type",
          msg: "Banner đã đủ 4 mục đang hiển thị",
        });
      }
    }

    if (responseErrors.length > 0) {
      if (image) {
        File.deleteFile(image.path);
      }

      return res.render("admin/update-header-image", {
        pageTitle: "Update Header Image",
        path: "/admin/edit-header",
        hasError: true,
        validationErrors: responseErrors,
        editing: false,
        imageData: updatedImage,
      });
    }
    if (image) {
      await File.deleteFile(oldImagePath);
    }
    await updatedImage.save();

    return res.redirect(`/admin/edit-header/${imageId}`);
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.deleteHeaderImage = async (req, res, next) => {
  const imageId = req.body.imageId;

  try {
    await HeaderImage.deleteOne({ _id: imageId });
    res.redirect("/admin/edit-header");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.returnOrder = async (req, res, next) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findById(orderId);
    await order.populate("user.userId").execPopulate();

    if (order) {
      order.status = "Đã trả về";
      await order.save();
      await sendMailOrderStatus(order);
    }
    res.redirect("/admin/orders");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.updateOrder = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findById(orderId);
    await order.populate("user.userId").execPopulate();

    if (order) {
      if (["Đã hủy", "Đã nhận"].includes(order.status)) {
        const error = {
          message:
            order.status === "Đã hủy"
              ? "Đơn hàng này đã bị hủy"
              : "Đơn hàng này đã được nhận",
          orderId: orderId,
        };

        const orders = await Order.find();
        return res.render("shop/orders", {
          path: "/orders",
          pageTitle: "Your Orders",
          orders: orders,
          error: error,
        });
      }

      switch (order.status) {
        case "Chờ xác nhận":
          order.status = "Đã xác nhận";
          break;
        case "Đã trả về":
        case "Đã xác nhận":
          order.status = "Đang vận chuyển";
          break;
        case "Đang vận chuyển":
          order.status = "Đã nhận";
          break;
        default:
          break;
      }

      await order.save();
      await sendMailOrderStatus(order);
      res.redirect("/admin/orders");
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findOne({ _id: orderId });
    if (order) {
      // Trường hợp đã hủy hoặc đã nhận trước đó
      if (["Đã hủy", "Đã nhận"].includes(order.status)) {
        return res.status(404).redirect("/admin/orders");
      }

      await order
        .populate("products.product.productId")
        .populate("user.userId")
        .execPopulate();

      order.status = "Đã hủy";
      await order.save();

      // Trả lại số lượng sản phẩm
      for (const p of order.products) {
        const product = p.product.productId;
        product.quantity += p.quantity;
        await product.save();
      }

      // Gửi mail xác nhận
      await sendMailOrderStatus(order);
      return res.status(200).redirect("/admin/orders");
    }
    res.status(404).redirect("/admin/orders");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  const ITEM_PER_PAGE = 2;

  const page = +req.query.page || 1;
  const email = req.query.e ? new RegExp(`.*${req.query.e}.*`, "i") : /.*/;
  const status = req.query.s || /.*/;

  let query = "";
  if (req.query.e || req.query.s) {
    query = queryString.stringify({
      e: req.query.e,
      s: req.query.s,
    });
  }

  const lookup = {
    from: User.collection.name,
    localField: "user.userId",
    foreignField: "_id",
    as: "user.userId",
  };

  try {
    let orders = await Order.aggregate([
      { $lookup: lookup },
      { $unwind: "$user.userId" },
      {
        $match: {
          "user.userId.email": email,
          status: status,
        },
      },
    ]).sort({
      createdAt: -1,
    });

    const total = orders.length;
    orders = orders.slice(
      (page - 1) * ITEM_PER_PAGE,
      (page - 1) * ITEM_PER_PAGE + ITEM_PER_PAGE
    );

    orders = formatOrderList(orders);

    res.render("admin/orders", {
      path: "/admin/orders",
      pageTitle: "Admin Orders",
      orders: orders,
      error: null,
      query: query,
      filter: query ? queryString.parse(query) : null,
      currentPage: page,
      totalItems: total,
      itemPerPage: ITEM_PER_PAGE,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getAllAccount = async (req, res, next) => {
  try {
    const accounts = await User.find();
    res.render("admin/accounts", {
      path: "/admin/accounts",
      pageTitle: "QL Tài Khoản",
      hasError: false,
      accounts: accounts,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.addAdminRole = async (req, res, next) => {
  const userId = req.body.id;
  try {
    const user = await User.findById(userId);
    if (user.roles.includes("admin")) {
      throw new Error("Tài khoản đã có quyền admin");
    }

    user.roles.push("admin");
    await user.save();

    res.redirect("/admin/accounts");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

const sendMailOrderStatus = async (order) => {
  const tableHtmlProducts = order.products.reduce((html, p) => {
    const price =
      Math.round((p.product.price * (1 - p.product.discount / 100)) / 10000) *
      10000;

    return (html += `<tr>
      <td style="border: 1px solid black;">${p.product.name}</td>
      <td style="border: 1px solid black;">${p.quantity}</td>
      <td style="border: 1px solid black;">${
        p.product.discount > 0 ? p.product.discount + "%" : "không có"
      }</td>
      <td style="border: 1px solid black;">${
        price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") + "đ"
      }</td>
    </tr>`);
  }, "");

  await sendMail({
    to: order.user.userId.email,
    subject: "Cập nhật đơn hàng",
    htmlContent: `
      <h2>Đơn hàng của bạn đã được cập nhật</h2>
      <h3><strong>Mã đơn hàng: ${order._id}</strong><h3>
      <h3>Trạng thái: ${order.status}, 
          cập nhật lúc ${order.updatedAt.getHours()}:${order.updatedAt.getMinutes()} ${order.updatedAt.getDate()}/${order.updatedAt.getMonth()}/${order.updatedAt.getFullYear()}
      </h3>
      <table style="border-collapse: collapse; border: 1px solid black;">
        <thead>
          <tr>
            <th style="border: 1px solid black;">Tên sản phẩm</th>
            <th style="border: 1px solid black;">Số lượng</th>
            <th style="border: 1px solid black;">Đã giảm giá</th>
            <th style="border: 1px solid black;">Giá</th>
          </tr>
        </thead>
        <tbody>
          ${tableHtmlProducts}
        </tbody>
      </table>
      <h4>Tổng tiền: ${
        order
          .getTotalPrice()
          .toString()
          .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") + "đ"
      }</h4>
    `,
  });
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
      res.setHeader(
        "Content-Disposition",
        "inline; filename='" + invoiceName + "'"
      );

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
            item.product.name +
              " - " +
              item.quantity +
              " x " +
              item.product.price +
              "đ"
          );
      });

      pdfDoc.fontSize(20).text("Total: " + totalPrice);

      pdfDoc.end();
    })
    .catch((err) => {
      return next(err);
    });
};
