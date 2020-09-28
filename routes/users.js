var express = require("express");
var router = express.Router();
var User = require("../models/User");
var mailer = require("../email");
const jwt = require("jsonwebtoken");

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
			var userMap = [];
			await User.find({}, (err, users) => {
				userMap = users;
			});
			return res.render("admin_index", { userMap: JSON.stringify(userMap) });
		}
	}
	return res.redirect("/");
});

router.get("/send-email", (req, res, next) => {
	token = jwt.sign({ userid: req.user._id }, process.env.JWT_SECRET, {
		expiresIn: "1h",
	});
	mailer(req.user.umassEmail, `${req.get("host")}/u/verify/${token}`);
	res.send("Sent :)");
});

router.get("/verify/:token", async (req, res, next) => {
	token = req.params.token;
	data = await jwt.verify(token, process.env.JWT_SECRET);
	userExists = await User.exists({ _id: data.userid });
	console.log(data);
	if (userExists) {
		User.findByIdAndUpdate(data.userid, { umassVerified: true }, function (
			err,
			user
		) {
			req.user.umassVerified = true;
			return res.render("verified");
		});
	} else {
		return res.render("not_verified");
	}
});

router.post("/update-email", async (req, res, next) => {
	await User.findByIdAndUpdate(
		req.user._id,
		{
			umassEmail: req.body.umassEmail,
		},
		function (err, docs) {
			if (!err) req.user.umassEmail = req.body.umassEmail;
		}
	);
	res.redirect("/");
});

module.exports = router;
