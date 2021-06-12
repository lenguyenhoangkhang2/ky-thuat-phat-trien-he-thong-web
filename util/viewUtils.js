const formatNumber = require("format-number");

exports.formatPrice = () => {
  return formatNumber({ suffix: "đ" })(discountPrice);
};
