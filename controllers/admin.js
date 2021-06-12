const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Product = require("../models/product");
const HeaderImage = require("../models/headerImage");
const File = require("../util/file");
const Order = require("../models/order");

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
      res.redirect("/admin/products");
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

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const name = req.body.name;
  const quantity = req.body.quantity;
  const brand = req.body.brand;
  const category = req.body.category;
  const official = req.files["official"];
  const slider = req.files["slider"];
  const price = req.body.price;
  const discount = req.body.discount;
  const description = req.body.description;
  const details = req.body.details;

  let responseErrors = [];

  validationResult(req)
    .array()
    .forEach((e) => responseErrors.push({ param: e.param, msg: e.msg }));

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

  Product.findById(prodId)
    .then((product) => {
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
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
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

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error("Product not found!"));
      }
      File.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      res.status(200).json({ message: "Success" });
    })
    .catch((err) => {
      res.status(500).json({ message: "Deleting product failed!" });
    });
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

exports.cancelOrder = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findOne({ _id: orderId });
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

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({
      createdAt: -1,
    });

    res.render("shop/orders", {
      path: "/admin/orders",
      pageTitle: "Admin Orders",
      orders: orders,
      error: null,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
