const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HeaderImageSchema = new Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    linkTo: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["banner", "slider"],
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HeaderImage", HeaderImageSchema);
