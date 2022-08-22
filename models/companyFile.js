const mongoose = require("mongoose");

const companyFileSchema = new mongoose.Schema({
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
  },
  { id:false, timestamps: true }
);

const CompanyFile = mongoose.model("CompanyFile", companyFileSchema);
module.exports = CompanyFile;
