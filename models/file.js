const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    student_id: {
        // type: mongoose.Schema.Types.ObjectId,
        type: String,
        // ref: "Student",
        required: true,
    },
    company_id: {
        // type: mongoose.Schema.Types.ObjectId,
        type: String,
        // ref: "Company",
        required: true,
    },
    file_path: {
        type: String,
        required: true,
    },
    // file_mimetype: {
    //   type: String,
    //   required: true,
    // },
});

const File = mongoose.model("File", fileSchema);
module.exports = File;
