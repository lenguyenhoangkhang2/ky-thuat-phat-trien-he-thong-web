const mongoose = require("mongoose");
const formatNumber = require("format-number");

const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["Laptop", "Điện thoại"],
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      min: 0,
      max: 100,
    },
    details: [
      {
        specKey: {
          type: String,
          required: true,
        },
        specValue: {
          type: String,
          required: true,
        },
      },
    ],
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      official: {
        type: String,
        required: true,
      },
      slider: {
        type: [String],
        required: true,
      },
    },
    reviews: {
      type: [
        {
          owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          rating: {
            type: Number,
            min: 0,
            max: 5,
          },
          comment: String,
        },
      ],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.methods = {
  getDetailsString() {
    return this.details
      .reduce((text, spec) => {
        return text + spec.specKey + ":" + spec.specValue + "\n";
      }, "")
      .replace(/\n$/, "");
  },
  getPriceWithDiscount() {
    return Math.round((this.price * (1 - this.discount / 100)) / 10000) * 10000;
  },
  formatDiscountPrice() {
    const discountPrice = this.getPriceWithDiscount();
    return formatNumber({ suffix: "đ" })(discountPrice);
  },
  formatPrice() {
    return formatNumber({ suffix: "đ" })(this.price);
  },
  getRating() {
    if (!this.reviews) {
      return null;
    }

    const sumRating = this.reviews.reduce((sum, value) => {
      return sum + value.rating;
    }, 0);

    return Math.round((sumRating * 2) / this.reviews.length) / 2;
  },
};

module.exports = mongoose.model("Product", productSchema);
