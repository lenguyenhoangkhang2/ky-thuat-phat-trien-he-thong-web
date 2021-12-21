module.exports.formatOrderList = (orders) => {
  orders.map((order) => {
    order.total = order.products.reduce((total, p) => {
      p.product.price =
        Math.round((p.product.price * (1 - p.product.discount / 100)) / 10000) *
        10000 *
        p.quantity;
      return (total += p.product.price);
    }, 0);
  });

  return orders;
};
