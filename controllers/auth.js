const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

const User = require("../models/user");
const { sendMail } = require("../util/mail");
const jwtToken = require("../util/jwtToken");

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: { email: "", password: "" },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: { email: "", password: "", confirmPassword: "" },
    validationErrors: [],
  });
};

exports.postLogin = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(442).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(442).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email!",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }

    if (!user.emailVerified) {
      return res.status(442).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Email chưa được xác nhận",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
        currentEmail: user.email,
      });
    }

    const doMath = await bcrypt.compare(password, user.password);

    if (doMath) {
      req.session.isLoggedIn = true;
      req.session.userId = user._id;
      return req.session.save((err) => {
        res.redirect("/");
      });
    } else {
      return res.status(442).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid password!",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.sendEmailVerify = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(442).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email!",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }

    const token = await jwtToken.generate(
      { email: email },
      process.env.VERIFY_USER_EMAIL_SECRET,
      "20m"
    );

    await sendMail({
      to: email,
      subject: "Xác nhận email Shop NodeJS",
      htmlContent: `
        <h3>Nhấn vào <a href='${req.headers.origin}/verify-email-by-token/${token}'>đường dẫn</a> để xác nhận email của bạn</h3>
      `,
    });

    res.status(442).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: "Đã gửi email xác nhận",
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: [],
      currentEmail: user.email,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.verifyUserEmailByToken = async (req, res, next) => {
  const token = req.params.token;
  try {
    const decoded = await jwtToken.verify(token, process.env.VERIFY_USER_EMAIL_SECRET);

    const user = await User.findOne({ email: decoded.data.email });
    user.emailVerified = true;
    await user.save();

    res.render("auth/verify-user-email", {
      resend: false,
      errorMessage: null,
      pageTitle: "Xác nhận email",
      email: null,
      reSendErrorMessage: null,
    });
  } catch (err) {
    res.render("auth/verify-user-email", {
      resend: false,
      errorMessage: err.message,
      pageTitle: "Xác nhận email",
      email: null,
      reSendErrorMessage: null,
    });
  }
};

exports.reSendVerifyUserEmailWhenError = async (req, res, next) => {
  const email = req.body.email;
  const oldErrorMessage = req.body.errorMessage;

  const errors = [...validationResult(req).array()];

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      errors.push({ msg: "Email này chưa được đăng ký" });
    }

    if (user.emailVerified) {
      errors.push({ msg: "Email này đã được xác nhận" });
    }

    if (errors.length > 0) {
      return res.render("auth/verify-user-email", {
        errorMessage: oldErrorMessage,
        resend: true,
        reSendErrorMessage: errors[0].msg,
        email: email,
        pageTitle: "Xác nhận email",
      });
    }

    const token = await jwtToken.generate(
      { email: email },
      process.env.VERIFY_USER_EMAIL_SECRET,
      "30000"
    );

    await sendMail({
      to: email,
      subject: "Xác nhận email Shop NodeJS",
      htmlContent: `
        <h3>Nhấn vào <a href='${req.headers.origin}/verify-email-by-token/${token}'>đường dẫn</a> để xác nhận email của bạn</h3>
      `,
    });

    return res.render("auth/verify-user-email", {
      resend: true,
      errorMessage: oldErrorMessage,
      reSendErrorMessage: null,
      pageTitle: "Xác nhận email",
      email: email,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        name: name,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
        cart: { items: [] },
      });

      return user.save();
    })
    .then(() => {
      res.redirect("/login");
      return sendMail(
        email,
        "Đăng ký thành công",
        "Bạn đã đang ký tài khoản website thành công"
      );
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }

    const token = buffer.toString("hex");
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        req.flash("error", "No account with that email found!");
        return res.redirect("/reset");
      }

      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 360000;
      await user.save();
      await sendMail({
        to: req.body.email,
        subject: "Password Reset",
        htmlContent: `<p>You requested a password reset.</p>
        <p>Click this <a href="http://localhost:3000/reset/${token}">link reset password</a> to set new password.</p>`,
      });

      res.redirect("/login");
    } catch (err) {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    }
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }

      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
