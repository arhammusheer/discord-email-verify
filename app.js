require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var passport = require("passport");
var DiscordStrategy = require("passport-discord").Strategy;
var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
var mongoose = require("mongoose");
var bodyParser = require("body-parser");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

//Mongo DB Handler Setup
mongoose.Promise = global.Promise;

mongoose
    .connect(process.env.MONGODB_URL_WITH_CREDS, {
        dbName: process.env.DBNAME,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then(() => {
        console.log("DB Connected");
    })
    .catch((err) => {
        console.log(err);
    });

//Session Controller
app.use(
    require("express-session")({
        secret: process.env.EXPRESS_SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

//OAuth Handler setup
app.use(passport.initialize());
app.use(passport.session());

var oAuthScopes = ["identify", "email"];

var User = require("./models/User");

passport.use(
    new DiscordStrategy({
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: "/auth/discord/callback",
            scope: oAuthScopes,
        },
        function(accessToken, refreshToken, profile, cb) {
            console.log(profile);
            User.findOrCreate({
                    discordId: profile.id,
                    username: profile.username,
                    discriminator: profile.discriminator,
                    email: profile.email,
                },
                function(err, user) {
                    return cb(err, user);
                }
            );
        }
    )
);

passport.serializeUser(function(user, cb) {
    cb(null, user);
});
passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/u", usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;