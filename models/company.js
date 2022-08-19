const mongoose = require("mongoose");
const { validator, isEmail, isURL } = require("validator");
const Job = require("./job");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Enter the Company Name"],
    },
    websiteUrl: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true, // as email needs to be unique
      validate: [isEmail, "Please enter a valid email"],
    },
    companyLocation: {
      type: String,
    }
  },
  { timestamps: true }
);

// * We can get all the Company JobDescriptions using Populate as follows:
// ! const company = await Company.find().populate({path: 'jobDescriptions'});
// ? Basically we get a Array with Name 'jobDescriptions' which contains All the Jobs and all the Details of this Company
companySchema.virtual("jobDescriptions", {
  ref: "Job",
  localField: "_id",
  foreignField: "companyId",
  _id: false
});

companySchema.set('toObject', { virtuals: true });
companySchema.set('toJSON', { virtuals: true });

companySchema.pre("remove", async function (next) {
  console.log('this', this);
  // this.model("Application")/remove({ _id: this._id }, next);
  // await Job.deleteMany({
  //   companyId: this._id
  // }).exec(async function (err, success) {
  //   if (err) { console.log(err); }
  //   await Application;

  // })
  const myJobsArray = await Job.populate
  await Job.deleteMany();
  next();
});

const Company = mongoose.model("Company", companySchema);

module.exports = Company;