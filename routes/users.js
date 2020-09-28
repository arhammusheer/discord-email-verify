var express = require("express");
var router = express.Router();
var User = require("../models/User");
var mailer = require("../email");
const jwt = require("jsonwebtoken");
const Discord = require("discord.js");
const bot = new Discord.Client();

bot.login(process.env.BOT_TOKEN);

bot.once("ready", () => {
	console.log("Bot logged in");
});

//User homepage
router.get("/", (req, res, next) => {
	if (req.user) {
		res.render("user_index", { User: req.user });
	} else {
		res.redirect("/");
	}
});

//Admin console
router.get("/admin", async (req, res, next) => {
	if (req.user) {
		if (req.user.isAdmin) {
			var userMap = [];
			await User.find({}, (err, users) => {
				userMap = users;
				return res.render("admin_index", { userMap: JSON.stringify(userMap) });
			});
			return res.render("message", {
				title: "Error occured loading page.",
				message:
					"An error might have occured while loading the page. Try refreshing.",
			});
		}
	} else {
		return res.render("error", {
			message: "401, Unauthorized Access",
			error: { status: "You are not authorized to access this page." },
		});
	}
});

//verification Email send service
router.get("/send-email", (req, res, next) => {
	token = jwt.sign({ userid: req.user._id }, process.env.JWT_SECRET, {
		expiresIn: "1h",
	});
	mailer(req.user.umassEmail, `${req.get("host")}/u/verify/${token}`, req.user);
	res.redirect("/u/email-sent");
});

//Email sent
router.get("/email-sent", (req, res, next) => {
	res.render("email_sent");
});

//Email verification token link handler
router.get("/verify/:token", async (req, res, next) => {
	token = req.params.token;
	data = await jwt.verify(token, process.env.JWT_SECRET);
	userExists = await User.exists({ _id: data.userid });
	console.log(data);
	if (userExists) {
		await User.findByIdAndUpdate(
			data.userid,
			{ umassVerified: true },
			function (err, user) {
				if (err) {
					return res.render("error", {
						message: "401, Unauthorized Access",
						error: { status: "You are not authorized to access this page." },
					});
				}
				if (req.user) req.user.umassVerified = true;
				return res.redirect("/u/assign-role");
			}
		);
	} else {
		return res.render("not_verified");
	}
});

//Update Email
router.post("/update-email", async (req, res, next) => {
	if (req.user) {
		if (req.body.umassEmail.endsWith("@umass.edu")) {
			await User.findByIdAndUpdate(
				req.user._id,
				{
					umassEmail: req.body.umassEmail,
				},
				function (err, docs) {
					if (!err) req.user.umassEmail = req.body.umassEmail;
				}
			);
		} else {
			alertMessage = "The email you have entered isn't affiliated with UMass";
			return res.render("user_index", { User: req.user, alert: alertMessage });
		}
	}

	res.redirect("/");
});

//Add new admin
router.post("/admin/add-admin", async (req, res, next) => {
	if (req.user) {
		if (req.user.isAdmin) {
			newAdmin = req.body.discordUsername.trim().split("#");
			username = newAdmin[0];
			discriminator = newAdmin[1];
			if (
				req.user.username == username &&
				req.user.discriminator == discriminator
			) {
				return res.render("message", {
					title: `You cannot add yourself twice to admins`,
					message: `YOU ARE ALREADY AN ADMIN....there's not anything above this.`,
					revertLink: {
						url: "/u/admin",
						message: "Go back to admin page",
					},
				});
			}
			await User.findOneAndUpdate(
				{
					username: username,
					discriminator: discriminator,
				},
				{ isAdmin: true },
				(err, user) => {
					if (!err)
						res.render("message", {
							title: `${username}#${discriminator} is now an admin`,
							message: `${username}#${discriminator} has now been added to admins and has access to admin console`,
							revertLink: {
								url: "/u/admin",
								message: "Go back to admin page",
							},
						});
				}
			);
		} else {
			res.render("message", {
				title: `You do not have access permissions to do that.`,
				message: `Sorry but you do not have permissions to do that. Make sure you are an admin.`,
				revertLink: {
					url: "/u",
					message: "Go back to home page",
				},
			});
		}
	} else {
		res.redirect("/");
	}
});

//Add new admin
router.post("/admin/remove-admin", async (req, res, next) => {
	if (req.user) {
		if (req.user.isAdmin) {
			newAdmin = req.body.discordUsername.trim().split("#");
			username = newAdmin[0];
			discriminator = newAdmin[1];
			if (
				req.user.username == username &&
				req.user.discriminator == discriminator
			) {
				return res.render("message", {
					title: `You cannot remove your own admin`,
					message: `Bruh.....Why you wanna remove your own admin. Can't do that.`,
					revertLink: {
						url: "/u/admin",
						message: "Go back to admin page",
					},
				});
			}
			await User.findOneAndUpdate(
				{
					username: username,
					discriminator: discriminator,
				},
				{ isAdmin: false },
				(err, user) => {
					if (!err)
						res.render("message", {
							title: `${username}#${discriminator} has been removed from admin`,
							message: `${username}#${discriminator} has now been removed from admins.`,
							revertLink: {
								url: "/u/admin",
								message: "Go back to admin page",
							},
						});
				}
			);
		} else {
			res.render("message", {
				title: `You do not have access permissions to do that.`,
				message: `Sorry but you do not have permissions to do that. Make sure you are an admin.`,
				revertLink: {
					url: "/u",
					message: "Go back to home page",
				},
			});
		}
	} else {
		res.redirect("/");
	}
});

router.get("/assign-role", async (req, res, next) => {
	if (req.user) {
		await addVerifiedRole(req.user.discordId);
		res.render("message", {
			title: `Yay, you are now verified`,
			message: `You have been given the Verified ✔ role.`,
			revertLink: {
				url: "/u",
				message: "Go back to home page",
			},
		});
	} else {
		res.redirect("/");
	}
});

async function addVerifiedRole(discordId) {
	var guild = await bot.guilds.cache.get(process.env.GUILD_ID);
	var user = await bot.users.cache.get(discordId);
	var member = await guild.member(user);
	return member.roles.add("760132141048135711");
}

module.exports = router;
