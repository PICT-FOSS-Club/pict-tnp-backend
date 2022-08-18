const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
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
        branch: {
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
        requiredAmcatScore: {
            type: Number,
            default: 0,
        },
        requiredAttendance: {
            type: Number,
            default: 0,
        },
        sscPercentage: {
            type: Number,
        },
        hscPercentage: {
            type: Number,
        },
        courseName: {
            ug: { type: Boolean },
            pg: { type: Boolean },
        },
    },
    skillsRequired: [],
    roundDetails: [
        {
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
        }
    ],
    // * This indicate whether the Drive of this job is Ended
    jobResult: {
        type: Boolean,
        default: false,
    },
});

// * This virtual will make relation between Job and Company
jobSchema.virtual('company', {
    ref: "Company",
    localField: "companyId",
    foreignField: "_id"
})

// * We can get all the jobApplications of this Job using Populate as follows:
// ! const job = await Job.find().populate({path: 'jobApplications'});
// ? Basically we get a Array with Name 'jobApplications' which contains All the Applications and all Details of this Job
jobSchema.virtual("jobApplications", {
    ref: "Application",
    localField: "_id",
    foreignField: "jobId"
});

jobSchema.set('toObject', { virtuals: true });
jobSchema.set('toJSON', { virtuals: true });

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;