const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  file_path: {
    type: String,
    required: true,
  },
});

const Resume = mongoose.model("Resume", resumeSchema);
module.exports = Resume;
