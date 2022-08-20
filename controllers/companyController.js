const Job = require("../models/job");
const Company = require("../models/company");
const CompanyFile = require("../models/companyFile");
const multer = require("multer");
const fs = require("fs-extra");
const mv = require("mv");
const path = require("path");
// Company Routes --> /company/

let upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      let path = `./uploads/trial/files`;
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      cb(null, path);
    },
    filename: async (req, file, cb) => {
      cb(null, "trial" + path.extname(file.originalname));
    },
  }),
}).single("company-file");

// Add Company
module.exports.add_company = async (req, res) => {
  upload(req, res, async () => {
    try {
      const company = await Company.create(JSON.parse(req.body.company));
      req.company = company;
      let oldPath = `./uploads/trial/files/trial.pdf`;
      let newPath = `./uploads/${company.name}/files/${company.name}.pdf`;

      mv(oldPath, newPath, { mkdirp: true }, async function (err) {
        if (err) {
          const co = await Company.deleteOne({ _id: company._id });
          res
            .status(400)
            .json({ success: false, message: "Something Went Wrong!" });
        }
      });
      const companyFile = await CompanyFile.create({
        companyId: company._id,
        path: `./uploads/${company.name}/file/${company.name}.pdf`,
      });
      req.companyFile = companyFile;
      res.status(201).json({
        success: true,
        message: "Company Details Added Successfully.",
        company,
        companyFile,
      });
    } catch (err) {
      const co = await Company.deleteOne({ _id: company._id });
      if (
        fs.existsSync(
          `./uploads/${req.company.name}/file/${req.company.name}.pdf`
        )
      ) {
        fs.unlink(`./uploads/${req.company.name}/file/${req.company.name}.pdf`);
      }
      res.status(400).json({ success: false, message: err.message });
    }
  });
};

// Update Company
module.exports.update_company = async (req, res) => {
  const { companyId, company } = req.body;

  try {
    await Company.findByIdAndUpdate(companyId, company);
    res.status(200).json({
      success: true,
      message: "Company Details Updated Successfully.",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Updating Company Details.",
    });
  }
};

// Delete Company
module.exports.delete_company = async (req, res) => {
  const { companyId } = req.body;

  try {
    // Company.findById(companyId).populate({path: 'jobDescriptions'}).exec(function(err, company) {
    //   if(err) {
    //     return res.status(400).json({ success: true, error: err });
    //   }
    //   console.log('company', company);
    // });
    await Company.findByIdAndDelete(companyId);
    res.status(200).json({
      success: true,
      message: "Company Deleted Successfully.",
    });
  } catch {
    res.status(400).json({
      success: false,
      message: "Error while Deleting Company.",
    });
  }
};

// Company Job Routes --> /company/job/

// Add Company Job
module.exports.add_job = async (req, res) => {
  try {
    await Job.create(req.body);
    const company = await Company.findById(req.body.companyId).populate({
      path: "jobDescriptions",
    });
    res.status(201).json({
      success: true,
      data: company,
      message: "Job Added Successfully.",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while applying company drive.",
    });
  }
};

// Update Company Job
module.exports.update_job = async (req, res) => {
  const { jobId, job } = req.body;

  try {
    // Avoid the changing of companyId and jobResult fields of the Job.
    delete job.companyId, delete job.jobResult;
    await Job.findByIdAndUpdate(jobId, job);
    res.status(200).json({
      success: true,
      message: "Company Details Updated Successfully.",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Updating Company Details.",
    });
  }
};

// delete company job
module.exports.delete_job = async (req, res) => {};

// add company job round
module.exports.job_round_add = async (req, res) => {};

// update company job round
module.exports.job_round_update = async (req, res) => {};

// delete company job round
module.exports.job_round_delete = async (req, res) => {};

// declare company job round result
module.exports.job_round_result_declare = async (req, res) => {};

// update company job round result
module.exports.job_round_result_update = async (req, res) => {};

// delete company job round result
module.exports.job_round_result_delete = async (req, res) => {};

// module.exports.rounds_result = async (req, res) => {
//   const { companyId, qualifiedStudents } = req.body;

//   const transporter = nodeMailer.createTransport({
//     service: process.env.SMTP_SERVICE,
//     auth: {
//       user: process.env.SMTP_MAIL,
//       pass: process.env.SMTP_PASSWORD,
//     },
//   });
//   try {
//     const company = await Company.findById(companyId);
//     const currentRound = company.currentRound;
//     if (company.currentRound + 1 > company.totalRounds) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Drive is Completed." });
//     }
//     company.currentRound = currentRound + 1;
//     await company.save();

//     let qualMessage = `Your are qualified for ${currentRound + 1} round of ${
//       company.name
//     }.`;
//     let disqualMessage = `Your are Disqualified for ${
//       currentRound + 1
//     } round of ${company.name}.`;
//     const previousQualifiedStudents = company.appliedStudents.filter(
//       (appliedStudent) =>
//         appliedStudent.roundCleared === company.currentRound - 1
//     );
//     const qualStudents = [],
//       disqualStudents = [];

//     for (i = 0; i < qualifiedStudents.length; i++) {
//       qualStudents.push(qualifiedStudents[i].studentEmail);
//     }

//     for (const prevQualStudent of previousQualifiedStudents) {
//       if (qualStudents.includes(prevQualStudent.studentEmail)) {
//         await Company.findOneAndUpdate(
//           {
//             _id: companyId,
//             "appliedStudents.studentEmail": {
//               $eq: prevQualStudent.studentEmail,
//             },
//           },
//           { $inc: { "appliedStudents.$.roundCleared": 1 } }
//         );
//         await Student.findOneAndUpdate(
//           {
//             email: prevQualStudent.studentEmail,
//             "appliedCompanies.companyId": { $eq: companyId },
//           },
//           { $inc: { "appliedCompanies.$.roundCleared": 1 } }
//         );
//         if (company.currentRound === company.totalRounds) {
//           company.result = true;
//           company.ctc <= 20
//             ? await Student.findOneAndUpdate(
//                 { email: prevQualStudent.studentEmail },
//                 { $set: { isLTE20: true } }
//               )
//             : await Student.findOneAndUpdate(
//                 { email: prevQualStudent.studentEmail },
//                 { $set: { isGT20: true } }
//               );
//           company.save();
//           qualMessage += `\nCongratulations you are placed in ${company.name}!😍😍😍.`;
//         }
//       } else {
//         disqualStudents.push(prevQualStudent.studentEmail);
//         await Company.findOneAndUpdate(
//           {
//             _id: companyId,
//             "appliedStudents.studentEmail": {
//               $eq: prevQualStudent.studentEmail,
//             },
//           },
//           { $set: { "appliedStudents.$.studentResult": false } }
//         );
//         await Student.findOneAndUpdate(
//           {
//             email: prevQualStudent.studentEmail,
//             "appliedCompanies.companyId": { $eq: companyId },
//           },
//           { $set: { "appliedCompanies.$.result": false } }
//         );
//       }
//     }
//     // console.log("qualified st", qualStudents);
//     // console.log("disqualified st", disqualStudents);
//     try {
//       if (qualStudents.length != 0) {
//         await transporter.sendMail(
//           {
//             from: process.env.SMTP_SERVICE,
//             to: qualStudents,
//             subject: "Qualification of Rounds",
//             html: qualMessage,
//           },
//           async (error, data) => {
//             if (error) {
//               console.log(error);
//               return res
//                 .status(500)
//                 .json({ message: "ERROR SENDING MAIL !!!" });
//             } else {
//               if (disqualStudents.length != 0) {
//                 await transporter.sendMail(
//                   {
//                     from: process.env.SMTP_SERVICE,
//                     to: disqualStudents,
//                     subject: "Qualification of Rounds",
//                     html: disqualMessage,
//                   },
//                   (error, data) => {
//                     if (error) {
//                       console.log(error);
//                       return res
//                         .status(500)
//                         .json({ message: "ERROR SENDING MAIL !!!" });
//                     } else {
//                       console.log(
//                         "Sent!",
//                         data.response,
//                         " messageId: ",
//                         data.messageId
//                       );
//                       return res
//                         .status(200)
//                         .json({ message: "NOTIFICATION MAIL SENT !!!" });
//                     }
//                   }
//                 );
//               }
//               return res
//                 .status(200)
//                 .json({ message: "Email sent to all qualified students only" });
//             }
//           }
//         );
//       }
//     } catch (err) {
//       console.log("err in rounds_result", err);
//     }
//   } catch (err) {
//     console.log(err);
//     return res.status(400).json({
//       success: false,
//       message: "Error while updating the company details.",
//     });
//   }
// };
