var express = require("express");
var router = express.Router();
var passport = require("passport");

/* GET home page. */
router.get("/", (req, res, next) => {
    if (req.user) {
        return res.redirect("/u");
    }
    return res.render("index", {
        title: "Express"
    });
});

router.get("/logout", (req, res, next) => {
    if (req.user) {
        req.logout();
        return res.redirect("/");
    }
});

router.get(
	"/auth/discord", 
	passport.authenticate("discord")
);

router.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
        failureRedirect: "/",
    }),
    function(req, res) {
        res.redirect("/auth/google"); // Successful auth from Discord
    }
);

router.get(
    '/auth/google',
    passport.authenticate('google')
);

router.get(
	'/auth/google/callback',
	passport.authenticate('google', {
		failureRedirect: '/',
	}),
	function(req, res) {
		res.redirect("/u"); // Successful auth
	}
);

module.exports = router;