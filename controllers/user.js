const { validationResult } = require("express-validator");

exports.getProfile = (req, res, next) => {
  res.render("profile", {
    user: req.user,
    path: "/profile",
    pageTitle: "Profile",
    edit: false,
    hasErrorUpdateContact: false,
    errorMessage: null,
  });
};

exports.updateContact = async (req, res, next) => {
  const errors = validationResult(req);
  console.log("error", errors);

  if (!errors.isEmpty()) {
    return res.status(422).render("profile", {
      user: req.user,
      pageTitle: "Profile",
      edit: true,
      path: "/profile",
      hasErrorUpdateContact: true,
      errorMessage: errors.array()[0].msg,
    });
  } else {
    req.user.contact.country = req.body.country;
    req.user.contact.province = req.body.province;
    req.user.contact.district = req.body.district;
    req.user.contact.detail = req.body.detail;
    req.user.contact.phone = req.body.phone;
    try {
      await req.user.save();
      return res.redirect("/profile");
    } catch (error) {
      throw new Error();
    }
  }
};
