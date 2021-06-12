const deleteProduct = (btn) => {
  const proId = btn.parentNode.querySelector("[name=productId").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf").value;
  const productElement = btn.closest("article");

  fetch("/admin/product/" + proId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
      productElement.parentNode.removeChild(productElement);
    })
    .catch((error) => {
      console.log(error);
    });
};
