module.exports = {
  isAuth: (req, res, next) => {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    }
    next();
  },

  isGuest: (req, res, next) => {
    if (req.session.isLoggedIn) {
      return res.redirect("/");
    }
    next();
  },

  isAdmin: (req, res, next) => {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    } else {
      if (!req.user.roles.includes("admin")) {
        const err = new Error("Yêu cầu quyền ADMIN");
        err.httpStatusCode = 403;
        next(err);
      }
    }
    next();
  },
};
