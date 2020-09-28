var mongoose = require("mongoose");
var findOrCreate = require("mongoose-findorcreate");

var Schema = mongoose.Schema;

var UserSchema = new Schema({
	discordId: String,
	username: { type: String, unique: false },
	discriminator: { type: String, unique: false },
	email: { type: String, unique: false },
	umassEmail: { type: String, unique: false, default: null },
	umassVerified: { type: Boolean, default: false, unique: false },
	isAdmin: { type: Boolean, default: false },
	token: String,
	tokenDate: Date,
});

UserSchema.plugin(findOrCreate);

global.UserSchema = global.UserSchema || mongoose.model("User", UserSchema);
module.exports = global.UserSchema;
