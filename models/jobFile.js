const mongoose = require("mongoose");

const jobFileSchema = new mongoose.Schema({
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
  path: {
    type: String,
    required: true,
  },
},
  { id: false, timestamps: true }
);

const JobFile = mongoose.model("JobFile", jobFileSchema);
module.exports = JobFile;
