const mongoose = require("mongoose");
const Application = require("./application");

const jobSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Enter the Company Name"],
    },
    ctc: {
      type: Number,
      required: [true, "Enter the CTC"],
    },
    totalRounds: {
      type: Number,
      required: [true, "Total number of round is missing"],
    },
    currentRound: {
      type: Number,
      default: 0,
    },
    endDate: {
      type: Date,
      required: [true, "Enter End date for Applying"],
    },
    criteria: {
      ug: {
        cs: { type: Boolean },
        it: { type: Boolean },
        entc: { type: Boolean },
      },
      pg: {
        cs: { type: Boolean },
        it: { type: Boolean },
        entc: { type: Boolean },
      },
      gender: {
        male: { type: Boolean },
        female: { type: Boolean },
        both: { type: Boolean },
      },
      engCgpa: {
        type: Number,
      },
      sscPercentage: {
        type: Number,
      },
      hscPercentage: {
        type: Number,
      },
      activeBacklog: {
        type: Number,
        default: 0
      },
      passiveBacklog: {
        type: Number,
        default: 0
      },
      amcatScore: {
        type: Number,
        default: 0,
      },
      attendance: {
        type: Number,
        default: 0,
      },
    },
    skillsRequired: [{
      skill: {
        type: String
      }
    }],
    roundDetails: [
      {
        _id: false,
        roundNo: {
          type: Number,
          required: [true, "Enter Round No"],
          min: 1,
        },
        activity: {
          type: String,
          required: [true, "Mention Round activity"],
        },
        date: {
          type: String,
          required: [true, "Enter the date "],
        },
        day: {
          type: String,
        },
        time: {
          type: String,
          required: [true, "Mention time for the Round"],
        },
        venue: {
          type: String,
          required: [true, "Enter the venue of Round"],
        },
      },
    ],
    // * This indicate whether the Drive of this job is Ended
    jobResult: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

jobSchema.virtual("getCompany", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  _id: false,
});

// * We can get all the jobApplications of this Job using Populate as follows:
// ! const job = await Job.findById({ _id }).populate({path: 'jobApplications'});
// ? Basically we get a Array with Name 'jobApplications' which contains All the Applications and all Details of this Job
jobSchema.virtual("jobApplications", {
  ref: "Application",
  localField: "_id",
  foreignField: "jobId",
  _id: false,
});

jobSchema.set("toObject", { virtuals: true });
jobSchema.set("toJSON", { virtuals: true });

jobSchema.pre("remove", async function (next) {
  // console.log('this',this);
  // this.model("Application")/remove({ _id: this._id }, next);

  try {
    const applications = await Application.find({
      jobId: this._id,
    });

    if (!applications) {
      console.log("err in job pre in finding application");
    }

    // applications.remove();
    for (const application of applications) {
      await application.remove();
    }
  } catch (err) {
    console.log("err in job pre", err);
  }
  // await Application.deleteMany({
  //     jobId: this._id
  // });
  next();
});

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
