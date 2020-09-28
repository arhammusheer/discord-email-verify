var express = require("express");
var router = express.Router();
var User = require("../models/User");

/* GET users listing. */
router.get("/", (req, res, next) => {
	if (req.user) {
		res.render("user_index", { User: req.user });
	} else {
		res.redirect("/");
	}
});

router.get("/admin", async (req, res, next) => {
	if (req.user) {
		if (req.user.isAdmin) {
			var userMap = {};
			await User.find({}, (err, users) => {
				userMap = users;
			});
			return res.render("admin_index", { userMap: userMap });
		}
	}
	return res.redirect("/");
});

module.exports = router;
