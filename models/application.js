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
// applicationSchema.virtual('job', {
//     ref: "Job",
//     localField: "jobId",
//     foreignField: "_id"
// });

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
    // todo - job serch lte or gt, 
    const mystudent = await Student.findById(this.studentId);
    console.log("mystd", mystudent);
    console.log('my student ctc', mystudent.GT20.status)
    // * do not find Job.findByID it will give circular dependencies error
    if (mystudent.LTE20.status && JSON.stringify(mystudent.LTE20.jobId) == JSON.stringify(this.jobId)) {
        await mystudent.updateOne({ "LTE20.status": false, "LTE20.jobId": null })
    }
    // console.log('mystudent.GT20.jobId', typeof (mystudent.GT20.jobId))
    // console.log('this.jobId', typeof (this.jobId))
    console.log('matches with mystudent.GT20.jobId', JSON.stringify(mystudent.GT20.jobId) == JSON.stringify(this.jobId))
    if (mystudent.GT20.status && JSON.stringify(mystudent.GT20.jobId) == JSON.stringify(this.jobId)) {
        await mystudent.updateOne({ "GT20.status": false, "GT20.jobId": null })
    }
    next();
});

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;