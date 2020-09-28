var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
	if (req.user) {
		res.send("respond with a resource");
	} else {
		res.send("not logged in");
	}
});

module.exports = router;
