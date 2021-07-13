const mongoose = require("mongoose");
const Product = require("./product");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    contact: {
      phone: { type: String, default: "" },
      country: { type: String, default: "" },
      province: { type: String, default: "" },
      district: { type: String, default: "" },
      detail: { type: String, default: "" },
    },
    roles: {
      type: [String],
      enum: ["user", "admin"],
      default: "user",
    },
    googleId: {
      type: String,
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
      items: [
        {
          productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: { type: Number, required: true },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.addToCart = function (product) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });
  const updatedCartItems = [...this.cart.items];

  if (cartProductIndex >= 0) {
    throw new Error("Sản phẩm đã có trong giỏ hàng");
  } else {
    if (product.quantity === 0) {
      throw new Error("Đã hết sản phẩm");
    }
    product.quantity -= 1;
    product.save();

    updatedCartItems.push({
      productId: product._id,
      quantity: 1,
    });
  }
  const updatedCart = {
    items: updatedCartItems,
  };
  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.updatedCartItemQuantity = function (product, quantity) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });

  const updatedCartItems = [...this.cart.items];
  const oldQuantity = updatedCartItems[cartProductIndex].quantity;

  if (+quantity - oldQuantity > product.quantity) {
    throw new Error(`Sản phẩm ${product.name} không đủ số lượng`);
  }

  updatedCartItems[cartProductIndex].quantity = +quantity;
  product.quantity += oldQuantity - +quantity;
  product.save();

  const updatedCart = {
    items: updatedCartItems,
  };
  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.removeFromCart = async function (productId) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === productId.toString();
  });

  try {
    const product = await Product.findById(productId);
    product.quantity += this.cart.items[cartProductIndex].quantity;
    await product.save();
  } catch (error) {
    throw new Error();
  }

  this.cart.items = this.cart.items.filter((item) => {
    return item.productId.toString() !== productId.toString();
  });
  return this.save();
};

userSchema.methods.clearCart = function () {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
