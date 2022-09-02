const Job = require("../models/job");
const Company = require("../models/company");
const jobFile = require("../models/jobFile");
const multer = require("multer");
const fs = require("fs-extra");
const mv = require("mv");
const path = require("path");
const Application = require("../models/application");
const Student = require("../models/student");
const mongoose = require("mongoose");
const nodeMailer = require("nodemailer");
const JobFile = require("../models/jobFile");

// Company Routes --> /company/

let upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      let companyId = req.params.companyId;
      let company = await Company.findById(companyId);
      // console.log(company);
      if (!company) {
        throw Error("Company Not Found");
      }
      req.company = company;
      let jobId = req.params.jobId;
      // console.log(jobId);
      let job = await Job.findById(jobId);
      req.job = job;
      if (!job) {
        throw Error("Job Not Found");
      }
      let path = `./uploads/${company.name}/${job.name}`;
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      // console.log(path);
      cb(null, path);
    },
    filename: async (req, file, cb) => {
      const filename = req.job.name;
      req.filename = filename;
      cb(null, filename + path.extname(file.originalname));
    },
  }),
}).single("job-file");

// Add Company
module.exports.add_company = async (req, res) => {
  const company = req.body;
  try {
    await Company.create(company);
    res
      .status(201)
      .json({ success: true, message: "Company Drive Added Successfully." });
  } catch (err) {
    res.status(400).json({
      success: false,
      errors: err,
      message: "Error while applying company drive.",
    });
  }
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
  const companyId = req.params.id;
  try {
    // Company.findById(companyId).populate({path: 'jobDescriptions'}).exec(function(err, company) {
    //   if(err) {
    //     return res.status(400).json({ success: true, error: err });
    //   }
    //   console.log('company', company);
    // });
    // await Company.findByIdAndDelete(companyId);
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "company not found",
      });
    }

    await company.remove();

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
    // console.log(req.body)
    const newjob = await Job.create(req.body);

    const company = await Company.findById(req.body.companyId).populate({
      path: "jobDescriptions",
    });
    res.status(201).json({
      success: true,
      data: newjob,
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

//
module.exports.upload_job_files = async (req, res) => {
  upload(req, res, async () => {
    try {
      const jobFile = await JobFile.create({
        jobId: req.job._id,
        companyId: req.company._id,
        path: `./uploads/${req.company.name}/${req.job.name}.pdf`
      })
      res.status(200).json({
        success: true,
        message: "Job file uploaded successfully!",
        jobFile: jobFile
      })
    } catch (err) {
      res.status(400).json({
        success: true,
        message: err.message,
      })
    }
  })
}
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
module.exports.delete_job = async (req, res) => {
  try {
    const jobId = req.params.id;
    // console.log("jobId", jobId);
    const job = await Job.findById(jobId);
    // todo - delete job
    await job.remove();
    // console.log('job', job);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    await job.remove();
    return res
      .status(200)
      .json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    // console.log("err in deleting job", err);
  }
};

// add company job round
module.exports.job_round_add = async (req, res) => {
  const { jobId, round } = req.body;
  try {
    await Job.updateOne(
      { _id: jobId },
      { $inc: { totalRounds: 1 }, $push: { roundDetails: round } }
    );
    res.status(200).json({
      success: true,
      message: "Round Added Successfully.",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Adding Company Job Round.",
    });
  }
};

// update company job round
module.exports.job_round_update = async (req, res) => {
  const { jobId, round } = req.body;
  try {
    const roundNo = round.roundNo - 1;
    const job = await Job.findById(jobId);
    job.roundDetails[roundNo] = round;
    job.save();
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

// delete company job round
module.exports.job_round_delete = async (req, res) => { };

// declare company job round result
module.exports.job_round_result_declare = async (req, res) => {
  const { jobId, roundNo, qualifiedStudentIds, disqualifiedStudentIds } =
    req.body;

  const transporter = nodeMailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  let qualStudents = [],
    disqualStudents = [];

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(200).json({ success: false, message: "Job Not Found" });
    }
    const company = await Company.findById(job.companyId);
    job.currentRound = roundNo;
    // Updating the Qualified Students
    if (qualifiedStudentIds.length) {
      await Application.updateMany(
        { jobId: jobId, studentId: { $in: qualifiedStudentIds } },
        { studentRoundCleared: roundNo }
      );
    }
    // Updating the DisQualified Students
    if (disqualifiedStudentIds.length) {
      await Application.updateMany(
        { jobId: jobId, studentId: { $in: disqualifiedStudentIds } },
        { studentResult: false }
      );
    }
    // finding emails of qualified students
    const qualStudentsEmailList = await Student.find(
      { _id: { $in: qualifiedStudentIds } },
      { email: true }
    );
    // console.log("qualStudentsEmailList", qualStudentsEmailList);
    qualStudents = qualStudentsEmailList.map((student) => student.email);
    // console.log("qualStudents", qualStudents);

    // finding emails of disqualified students
    const disqualStudentsEmailList = await Student.find(
      { _id: { $in: disqualifiedStudentIds } },
      { email: true }
    );
    // console.log("disqualStudentsEmailList", disqualStudentsEmailList);
    disqualStudents = disqualStudentsEmailList.map((student) => student.email);
    // console.log("disqualStudents", disqualStudents);

    let qualMessage = `Congratulation, you cleared round ${parseInt(roundNo)} of ${company.name
      }.`;
    let disqualMessage = `You uncleared round ${parseInt(roundNo)} of ${company.name
      }.`;

    if (job.totalRounds == roundNo) {
      qualMessage = `\nCongratulations you are placed in ${company.name}!😍😍😍.`;
      if (job.ctc > 20) {
        // * here previousLTE20PlacedStudents contains only _id's as _id:true is an object, to convert it into array use map function
        const previousLTE20PlacedStudents = await Student.find(
          { _id: { $in: qualifiedStudentIds }, "LTE20.status": true },
          { _id: true }
        );
        const previousLTE20PlacedStudentIds = previousLTE20PlacedStudents.map(
          (student) => student._id
        );
        await Application.updateMany(
          { jobId: jobId, studentId: { $in: previousLTE20PlacedStudentIds } },
          { studentResult: false }
        );
        await Student.updateMany(
          { _id: { $in: qualifiedStudentIds } },
          { "GT20.status": true, "GT20.jobId": jobId }
        );
      } else {
        await Student.updateMany(
          { _id: { $in: qualifiedStudentIds } },
          { "LTE20.status": true, "LTE20.jobId": jobId }
        );
      }
      job.jobResult = true;
    }
    job.save();

    // now sending mail to qualified Students
    try {
      // let info = await transporter.sendMail({
      //   from: process.env.SMTP_SERVICE,
      //   bcc: qualStudents,
      //   subject: "Qualification of Rounds",
      //   html: qualMessage,
      // });
      // res.status(200).json({
      //   success: true,
      //   message: `Email send to ${qualStudents} successfully`,
      // });
      if (qualStudents.length != 0) {
        await transporter.sendMail(
          {
            from: process.env.SMTP_SERVICE,
            bcc: qualStudents,
            subject: "Qualification of Rounds",
            html: qualMessage,
          },
          async (error, data) => {
            if (error) {
              // console.log(error);
              res.status(500).json({ message: "ERROR SENDING MAIL !!!" });
            } else {
              // console.log("Sent! ", data.response, " messageId: ", data.messageId);
              // res.status(200).json({ message: 'NOTIFICATION MAIL SENT !!!' });

              if (disqualStudents.length != 0) {
                await transporter.sendMail(
                  {
                    from: process.env.SMTP_SERVICE,
                    bcc: disqualStudents,
                    subject: "Qualification of Rounds",
                    html: disqualMessage,
                  },
                  (error, data) => {
                    if (error) {
                      // console.log(error);
                      res
                        .status(500)
                        .json({ message: "ERROR SENDING MAIL !!!" });
                    } else {
                      // console.log(
                      //   "Sent!",
                      //   data.response,
                      //   " messageId: ",
                      //   data.messageId
                      // );
                      res
                        .status(200)
                        .json({ message: "NOTIFICATION MAIL SENT !!!" });
                    }
                  }
                );
              }else{
                res.status(200).json({ message: "Email sent!" });
              }
            }
          }
        );
      } else {
        // all students disqualified
        await transporter.sendMail(
          {
            from: process.env.SMTP_SERVICE,
            to: disqualStudents,
            subject: "Qualification of Rounds",
            html: disqualMessage,
          },
          async (error, data) => {
            if (error) {
              // console.log(error);
              res.status(500).json({ message: "ERROR SENDING MAIL !!!" });
            } else {
              // console.log(
              //   "Sent!",
              //   data.response,
              //   " messageId: ",
              //   data.messageId
              // );
              res.status(200).json({ message: "NOTIFICATION MAIL SENT !!!" });
            }
          }
        );
      }

      // console.log("Message sent: %s", info.messageId);
    } catch (err) {
      // console.log("err in rounds_result", err);
    }

    // res.status(200).json({ success: true, message: "Result Declared Successfully" });
  } catch (err) {
    // console.log(err);
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Updating Company Details.",
    });
  }
};

// update company job round result
module.exports.job_round_result_update = async (req, res) => {
  const { jobId, roundNo, qualifiedStudentIds, disqualifiedStudentIds } = req.body;
  try {
    const job = await Job.findById(jobId);
    const totalRoundNo = job.totalRounds, currentRoundNo = job.currentRound, updateRoundNo = roundNo;
    if (!job) {
      return res.status(200).json({ success: false, message: "Job Not Found" });
    }
    if (totalRoundNo == currentRoundNo) {
      if (currentRoundNo == updateRoundNo) { }
      else if (currentRoundNo > updateRoundNo) { }
    }
    else if (totalRoundNo > currentRoundNo) {
      if (currentRoundNo == updateRoundNo) { }
      else if (currentRoundNo > updateRoundNo) {
        // Updating the Qualified Students
        if (qualifiedStudentIds.length) {
          await Application.updateMany(
            { jobId: jobId, studentId: { $in: qualifiedStudentIds } },
            { $max: { studentRoundCleared: updateRoundNo }, studentResult: true }
          );
        }
        // Updating the DisQualified Students
        if (disqualifiedStudentIds.length) {
          await Application.updateMany(
            { jobId: jobId, studentId: { $in: disqualifiedStudentIds } },
            { studentRoundCleared: updateRoundNo - 1, studentResult: false }
          );
        }
      }
    }
  }
  catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Updating Company Details.",
    });
  }
};