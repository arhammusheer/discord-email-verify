var mongoose = require("mongoose");
var findOrCreate = require("mongoose-findorcreate");

var Schema = mongoose.Schema;

var UserSchema = new Schema({
	discordId: String,
	username: String,
	discriminator: String,
	email: String,
	umassEmail: String,
	umassVerified: String,
	guilds: Array,
});

UserSchema.plugin(findOrCreate);

global.UserSchema = global.UserSchema || mongoose.model("User", UserSchema);
module.exports = global.UserSchema;
