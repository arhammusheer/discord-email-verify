var express = require("express");
var router = express.Router();
var passport = require("passport");

/* GET home page. */
router.get("/", function (req, res, next) {
	res.render("index", { title: "Express" });
});

router.get("/auth/discord", passport.authenticate("discord"));
router.get(
	"/auth/discord/callback",
	passport.authenticate("discord", {
		failureRedirect: "/",
	}),
	function (req, res) {
		res.redirect("/u"); // Successful auth
	}
);

module.exports = router;
