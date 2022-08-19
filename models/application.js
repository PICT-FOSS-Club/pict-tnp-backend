const mongoose = require("mongoose");
const Student = require("./student");

const applicationSchema = new mongoose.Schema(
    {
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },
        studentRoundCleared: {
            type: Number,
            default: 0,
        },
        studentResult: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

// * This virtual will make relation between Application and Job
applicationSchema.virtual('job', {
    ref: "Job",
    localField: "jobId",
    foreignField: "_id"
});

// *  We can get the student of this Application using Populate as follows:
// ! const application = await Application.find().populate({path: 'student'});
// ? Basically we get all Details of that Applied Student and all Details of this Application
applicationSchema.virtual("student", {
    ref: "Student",
    localField: "studentId",
    foreignField: "_id"
});

applicationSchema.set('toObject', { virtuals: true });
applicationSchema.set('toJSON', { virtuals: true });

applicationSchema.pre("remove", async function (next) {
    // todo - handle student LTE20 & GT20  
    const student = await Student.updateMany({
        $and: [
            {
                $or: [
                    { "LTE20.status": true },
                    { "GT20.status": true }
                ]
            },
            {
                $or: [
                    { "LTE20.jobId": this.jobId },
                    { "GT20.jobId": this.jobId }
                ]
            }
        ]
    }, {
        $and: [
            {
                $or: [
                    { "LTE20.status": false },
                    { "GT20.status": false }
                ]
            },
            {
                $or: [
                    { "LTE20.jobId": null },
                    { "GT20.jobId": null }
                ]
            }
        ]
    })
    next();
});

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;