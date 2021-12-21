const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    products: [
      {
        product: {
          productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          name: { type: String, required: true },
          imageUrl: { type: String, required: true },
          price: { type: Number, required: true },
          discount: { type: Number, min: 0, max: 100, required: true },
        },
        quantity: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: [
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đang vận chuyển",
        "Đã nhận",
        "Đã trả về",
        "Đã hủy",
      ],
    },
    method: {
      type: String,
      required: true,
      enum: ["Cod"],
    },
    user: {
      address: {
        type: String,
        required: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
    },
  },
  { timestamps: true }
);

orderSchema.methods.getTotalPrice = function getTotalPrice() {
  return this.products.reduce((total, p) => {
    return (
      (total +=
        Math.round((p.product.price * (1 - p.product.discount / 100)) / 10000) *
        10000) * p.quantity
    );
  }, 0);
};

module.exports = mongoose.model("Order", orderSchema);
