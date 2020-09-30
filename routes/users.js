var express = require("express");
var router = express.Router();
var User = require("../models/User");
var mailer = require("../sendgridmail");
const jwt = require("jsonwebtoken");
const Discord = require("discord.js");
const bot = new Discord.Client({ autoReconnect: true });
const rateLimit = require("express-rate-limit");
const Cryptr = require("cryptr");
const { token } = require("morgan");

const cryptr = new Cryptr(process.env.JWT_ENCRYPTION_KEY);

bot.login(process.env.BOT_TOKEN);

bot.on("ready", () => {
	console.log("Connected to Discord servers");
});
bot.on("disconnect", () => {
	console.log("Disconnected from Discord servers");
});
bot.on("reconnecting", () => {
	console.log("Reconnecting to Discord servers");
});
bot.on("error", (error) => {
	console.error("Discord error:", error);
});

//User homepage
router.get("/", (req, res, next) => {
	console.log(`${req.ip} - /u`);
	if (req.user) {
		console.log(`${req.user.username}#${req.user.discriminator} - /u`);
		res.render("user_index", { User: req.user });
	} else {
		res.redirect("/");
	}
});

//Admin limiter exception
const adminLimiter = rateLimit({
	windowMs: 2 * 60 * 1000, //Every 2 minutes
	max: 200, // 50 Requests allowed
	message: `The system has detected too many requests from your IP. Please try again in a few moments.`,
});

//Admin console
router.get("/admin", adminLimiter, async (req, res, next) => {
	console.log(`${req.ip} - /u/admin`);
	if (req.user) {
		console.log(`${req.user.username}#${req.user.discriminator} - /u/admin`);
		if (req.user.isAdmin) {
			var userMap = [];
			await User.find({}, (err, users) => {
				userMap = users;
			});
			return res.render("admin_index", { userMap: JSON.stringify(userMap) });
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
	console.log(`${req.ip} - /u/send-email`);
	if (req.user) {
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/sent-email`
		);
		var token = jwt.sign(
			{
				userid: req.user._id,
				discriminator: req.user.discriminator,
				discordId: req.user.discordId,
			},
			process.env.JWT_SECRET,
			{
				expiresIn: "1h",
			}
		);
		token = cryptr.encrypt(JSON.stringify(token));
		mailer(
			req.user.umassEmail,
			`${req.get("host")}/u/verify/${token}`,
			req.user
		);
		res.redirect("/u/email-sent");
	} else {
		res.redirect("/");
	}
});

//Email sent
router.get("/email-sent", (req, res, next) => {
	console.log(`${req.ip} - /u/email-sent`);
	if (req.user)
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/email-sent`
		);
	res.render("email_sent");
});

//Email verification token link handler
router.get("/verify/:token", async (req, res, next) => {
	console.log(`${req.ip} - /verify/:token`);
	if (req.user)
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/verify/:token`
		);
	var token;
	try {
		token = cryptr.decrypt(req.params.token);
	} catch (err) {
		console.error(`Could not decrypt the email token received. Invalid link.`);
		token = false;
	}
	if (token == false) {
		return res.render("message", {
			title: `Invalid Link`,
			color: `danger`,
			message: `We could not decrypt the link you used. Please make sure it is not expired as our links expire every 60 minutes.`,
			revertLink: {
				url: "/",
				message: "Go back to home page",
			},
		});
	}
	token = JSON.parse(token);
	var tokenStatus, userExists;
	data = await jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) return (tokenStatus = false);
		tokenStatus = true;
		return decoded;
	});
	if (tokenStatus) userExists = await User.exists({ _id: data.userid });
	console.log(data);
	if (userExists) {
		await User.findByIdAndUpdate(
			data.userid,
			{ umassVerified: true },
			function (err, user) {
				if (err) {
					res.status(401);
					return res.render("error", {
						message: "401, Unauthorized Access",
						error: { status: "You are not authorized to access this page." },
					});
				}
				if (req.user) req.user.umassVerified = true;

				addVerifiedRole(user.discordId);
				return res.render("message", {
					title: `Yay, you are now verified`,
					color: `success`,
					message: `You have been given the Verified ✔ role.`,
					revertLink: {
						url: "/u",
						message: "Go back to home page",
					},
				});

				return res.redirect("/u/assign-role");
			}
		);
	} else {
		return res.render("not_verified");
	}
});

//Update Email
router.post("/update-email", async (req, res, next) => {
	console.log(`${req.ip} - /u/update-email`);
	if (req.user) {
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/update-email`
		);
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
	console.log(`${req.ip} - /u/admin/add-admin POST`);
	if (req.user) {
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/add-admin POST`
		);
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
					color: `warning`,
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
							color: `success`,
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
				color: `warning`,
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
	console.log(`${req.ip} - /u/admin/remove-admin POST`);
	if (req.user) {
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/remove-admin POST`
		);
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
					color: `danger`,
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
							color: `primary`,
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
				color: `warning`,
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

//Verify user manually
router.post("/admin/manual-auth", async (req, res, next) => {
	console.log(`${req.ip} - /u/admin/manual-auth POST`);
	if (req.user) {
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/manual-auth POST`
		);
		if (req.user.isAdmin) {
			user = req.body.discordUsername.trim().split("#");
			await User.findOneAndUpdate(
				{
					username: user[0],
					discriminator: user[1],
				},
				{ umassVerified: true },
				async (err, user) => {
					if (!err) {
						await addVerifiedRole(user.discordId);
						res.render("message", {
							title: `${user.username}#${user.discriminator} has been approved`,
							color: `success`,
							message: `${user.username}#${user.discriminator} has now been given the ✔ verified role manually.`,
							revertLink: {
								url: "/u/admin",
								message: "Go back to admin page",
							},
						});
					}
				}
			);
		} else {
			res.render("message", {
				title: `You do not have access permissions to do that.`,
				color: `warning`,
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
	console.log(`${req.ip} - /u/assign-role POST`);
	if (req.user) {
		console.log(
			`${req.user.username}#${req.user.discriminator} - /u/assign-role`
		);
		roleAdded = await addVerifiedRole(req.user.discordId);
		if (roleAdded) {
			res.render("message", {
				title: `Yay, you are now verified`,
				color: `success`,
				message: `You have been given the Verified ✔ role.`,
				revertLink: {
					url: "/u",
					message: "Go back to home page",
				},
			});
		} else {
			res.render("message", {
				title: `Unable to find member`,
				color: `warning`,
				message: `The user you have mentioned has not joined <div class="text-primary">UMass Amherst Public Discord.</div>`,
				revertLink: {
					url: "/u",
					message: `Go back to home page`,
				},
			});
		}
	} else {
		res.redirect("/");
	}
});

async function addVerifiedRole(discordId) {
	var guild = bot.guilds.cache.get(process.env.GUILD_ID);
	var user = bot.users.cache.get(discordId);
	var member = guild.member(user);
	if (guild.member(user)) {
		member.roles.add("760132141048135711");
		return true;
	} else {
		return false;
	}
}

module.exports = router;
