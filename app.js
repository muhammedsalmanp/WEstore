require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("connect-flash");
const nocache = require("nocache");
const methodOverride = require("method-override");
const MongoStore = require("connect-mongo");
const { v4: uuidv4 } = require("uuid");

// Database connection
const connectDB = require("./server/config/db");

const authRouter = require("./server/routes/authRoutes");
const userRouter = require("./server/routes/shopRoutes");
const adminRouter = require("./server/routes/adminRoutes");

const { checkBlockedUser } = require("./server/middleware/authMiddleware");

// Connect Database
connectDB();

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.set("layout", "./layouts/userLayouts.ejs");

app.use(logger("dev"));
app.use(methodOverride("_method"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(expressLayouts);

// Sessions
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
      maxAge: 72 * 60 * 60 * 1000, // 72 hours
      httpOnly: true
  }
}));
//flsh messasge 
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Middleware to set the current route
app.use((req, res, next) => {
  res.locals.currentRoute = req.path;
  next();
});

// nocache for disabling browser caching
app.use(nocache());

app.use("/admin", adminRouter);
app.use("/", authRouter);
app.use("/",userRouter)


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(checkBlockedUser);

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

app.listen(3000,() => {
  console.log("http://localhost:3000");
});
