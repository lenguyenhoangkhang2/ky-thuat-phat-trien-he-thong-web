const dotenv = require("dotenv");
const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const passport = require("passport");
const csrf = require("csurf");
const flash = require("connect-flash");
const https = require("https");
const fs = require("fs");

const User = require("./models/user");
const { isAdmin } = require("./middleware/auth");

dotenv.config({ path: "./config/config.env" });
require("./util/googlePassport")(passport);

const MONGODB_URI = process.env.MONGO_URI;
const PORT = process.env.PORT;

const app = express();

const csrfProtection = csrf();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    //Lưu session vào cookie
    cookie: { maxAge: 60 * 60 * 1000 },

    // Lưu session vào database
    // store: new MongoDBStore({
    //   uri: MONGODB_URI,
    //   collection: "sessions",
    //   expires: 60*60*1000,
    // }),
  })
);
app.use(csrfProtection);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next) => {
  if (!req.session.userId) {
    return next();
  }
  User.findById(req.session.userId)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  if (req.user) {
    res.locals.isAdmin = req.user.roles.includes("admin");
    res.locals.username = req.user.name;
  } else {
    res.locals.isAdmin = false;
    res.locals.username = false;
  }
  next();
});

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const oauth2Routes = require("./routes/oauth2");
const userRoutes = require("./routes/user");

app.use("/admin", isAdmin, adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use(oauth2Routes);
app.use(userRoutes);

const errorController = require("./controllers/error");

app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log("Da chay vao day");
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  if (req.user) {
    res.locals.isAdmin = req.user.roles.includes("admin");
    res.locals.username = req.user.name;
  }

  if (error.httpStatusCode) {
    res.status(error.httpStatusCode).render("error", {
      pageTitle: `Error ${error.httpStatusCode}`,
      path: "/error",
      errorMessage: error.message || "Xảy ra lỗi chưa biết",
      httpStatusCode: error.httpStatusCode || false,
    });
  } else {
    res.status(500).render("500", {
      pageTitle: "Error",
      path: "/500",
    });
  }
});

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database is connected");

    https
      .createServer(
        {
          key: fs.readFileSync("server.key"),
          cert: fs.readFileSync("server.cert"),
        },
        app
      )
      .listen(PORT, () => {
        console.log(`HTTPS Server running on https://localhost:${PORT}`);
      });
  })
  .catch((err) => {
    console.log(err);
  });
