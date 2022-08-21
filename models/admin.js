const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, //as email needs to be unique
      validate: [isEmail, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    //new fields :
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordTokenForForgotPassword: String,
  },
  { timestamps: true }
);

// before saving to db hashing of ppassword
adminSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// login admin
adminSchema.statics.login = async function (email, password) {
  const admin = await this.findOne({ email });
  if (admin) {
    const auth = await bcrypt.compare(password, admin.password);
    if (auth) {
      return admin;
    }
    throw Error("Incorrect Password");
  }
  throw Error("Incorrect Email");
};

adminSchema.methods.generateAuthToken = async function () {
  try {
    let tokenGen = await jwt.sign({ _id: this._id }, process.env.JWT_SECRET);
    return tokenGen;
  } catch (err) {
    console.log("err in generateAuthToken admin", err);
  }
};

const Admin = mongoose.model("admin", adminSchema);

module.exports = Admin;
