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
        "Đang gửi",
        "Đã nhận",
        "Đã trả lại",
        "Đã hủy",
      ],
    },
    total: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      required: true,
      enum: ["Stripe", "Cod"],
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

module.exports = mongoose.model("Order", orderSchema);
