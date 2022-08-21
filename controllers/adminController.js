const Admin = require("../models/admin");
const Student = require("../models/student");
const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Job = require("../models/job");
const Application = require("../models/application");
const { createToken } = require("../utils/createToken");
const maxAge = 3 * 24 * 60 * 60;

// handle error
const handleErrors = (err) => {
  let errors = { email: "", password: "" };

  // incorrect email
  if (err.message === "Incorrect Email") {
    errors.email = "Email is not Registered";
  }
  // incorrect password
  if (err.message === "Incorrect Password") {
    errors.password = "Wrong password";
  }

  // duplicate error code
  if (err.code == 11000) {
    errors.email = "This Email is already Registered";
  }

  // validation Eroor
  if (err.message.includes("User validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

// maxtime for which token is active
const tokenAge = parseInt(process.env.JWT_AGE);

// sign up
module.exports.signup_admin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.create({ email, password });
    const token = await admin.generateAuthToken();
    res.cookie("token", token, { httpOnly: true, maxAge: maxAge * 1000 }); //30 days
    res
      .status(201)
      .json({ admin: admin._id, usertype: "admin", token, success: true });
  } catch (err) {
    const error = handleErrors(err);
    res.status(400).json({ error, success: false });
  }
};

// login admin
module.exports.login_admin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.login(email, password);
    const token = createToken(admin._id);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
    }); // 3 days
    res.status(200).json({ admin, usertype: "admin", token, success: true });
  } catch (err) {
    const error = handleErrors(err);
    res.status(400).json({ error, success: false });
  }
};

// logout admin
module.exports.logout_admin = (req, res) => {
  req.admin._id = "";
  res.cookie("token", "", { maxAge: 1 });
  res.cookie("usertype", "", { maxAge: 1 });
  res.send({ success: true, message: "Logged Out." });
};

// upate password
module.exports.admin_update_password = async (req, res) => {
  const admin = await Admin.findById(req.admin._id);

  const isPasswordMatched = await bcrypt.compare(
    req.body.oldPassword,
    admin.password
  );

  if (!isPasswordMatched) {
    return res.status(403).send("Passwords do not match");
  }

  // frontend compare newpassword with confirm password

  admin.password = req.body.newPassword;

  await admin.save();

  res.status(200).json({ success: true, message: "Password Updated." });
};

// admin reset Password
module.exports.admin_reset_password = async (req, res) => {
  //passing in query not in params
  // console.log('query', req.query);

  const admin = await Admin.findOne({ _id: req.query.id });
  const isValid = await bcrypt.compare(
    req.query.token,
    admin.resetPasswordToken
  );

  if (!isValid) {
    return res.send("Reset password token is invalid or has been expired", 400);
  }

  admin.password = req.body.newPassword;
  admin.resetPasswordToken = undefined;
  admin.resetPasswordExpire = undefined;

  await admin.save();

  //JWT_SECRET is a string -> parse it to integer
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
    expiresIn: parseInt(process.env.UPDATE_PASSWORD_AGE) * 1000,
  });

  // option for cookie
  const options = {
    expires: new Date(
      Date.now() + parseInt(process.env.UPDATE_PASSWORD_AGE) * 1000 //1000 for milliseconds
    ),
    httpOnly: true,
  };

  res.status(200).cookie("token", token, options).json({
    success: true,
    admin,
    token,
  });
};

// admin forgot Password
module.exports.admin_forgot_password = async (req, res) => {
  const admin = await Admin.findOne({ email: req.body.email });

  if (!admin) {
    return res.status(404).send("admin not found");
  }

  // generating token
  const resetToken = crypto.randomBytes(32).toString("hex");

  //generates salt
  const salt = await bcrypt.genSalt(8);

  const resetPasswordToken = await bcrypt.hash(resetToken, salt);

  //storing HASHED password in admin db, not token
  admin.resetPasswordToken = resetPasswordToken;

  admin.resetPasswordExpire = Date.now() + 15 * 60 * 1000; //15 minutes from now

  await admin.save({ validateBeforeSave: false });
  console.log("resetToken", resetToken);
  // now send email
  // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/resetPassword?token=${resetToken}&id=${user._id}`;
  const resetPasswordUrl = `http://localhost:3000/admin/password/reset/${resetToken}/${admin.id}`;

  const message = `Your reset password token is:- \n\n <a href=${resetPasswordUrl}>click here</a> \n\n If you have not reque
  sted please ignore this mail`;

  const transporter = nodeMailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    let info = await transporter.sendMail(
      {
        from: process.env.SMTP_SERVICE,
        to: admin.email,
        subject: "Password Recovery checking Admin",
        // text: message,
        html: message,
      },
      function (err, info) {
        if (err) throw err;
        console.log(
          "response:",
          info.response,
          " Message sent: %s",
          info.messageId
        );
        // 250 Requested mail action okay, completed
        res.status(250).json({
          success: true,
          message: `Email send to ${admin.email} successfully`,
        });
      }
    );

    // res.status(200).json({success: true,message: `Email send to ${admin.email} successfully`,});

    // console.log("Message sent: %s", info.messageId);
  } catch (error) {
    admin.resetPasswordToken = undefined;
    admin.resetPasswordToken = undefined;
    await admin.save({ validateBeforeSave: false });

    console.log(error);
  }
};

module.exports.register_student = async (req, res) => {
  const student = req.body;

  const { error } = Student.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).send(error.details[0].message);
  }

  try {
    const newStudent = await Student.create(student);

    const message = `Your TnP account has been created suceesfully \n\n Your password is your mobile Number `;

    const transporter = nodeMailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    try {
      let info = await transporter.sendMail(
        {
          from: process.env.SMTP_SERVICE,
          to: newStudent.email,
          subject: "Student Account created",
          html: message,
        },
        function (err, info) {
          if (err) throw err;
          console.log(
            "status:",
            info.response,
            " Message sent: %s",
            info.messageId
          );
          // 250 Requested mail action okay, completed
          res.status(250).json({
            success: true,
            message: `Email send to ${newStudent.email} successfully`,
          });
        }
      );

      // res.status(200).json({success: true,message: `Email send to ${newStudent.email} successfully`,});
    } catch (err) {
      console.log("err", err);
    }

    res
      .status(201)
      .json({ success: true, message: "Student Registered Successfully." });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.register_students = async (req, res) => {
  const students = req.body;
  let array = [];
  try {
    students.forEach(async (student) => {
      await Student.create(student);
    });

    students.forEach((student) => {
      array.push(student.email);
    });

    console.log(array);

    const transporter = nodeMailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const message = `Your TnP account has been created suceesfully \n\n Your password is your mobile Number `;

    let mailOptions = {
      from: process.env.SMTP_SERVICE,
      to: array,
      subject: "Final checking Latest",
      html: message,
    };

    // send response in another function after mailOptions else gives cant set headers after they're sent to the client error
    try {
      let info = await transporter.sendMail(mailOptions, function (err, info) {
        if (err) throw err;
        console.log(
          "status: ",
          info.response,
          " Message sent: %s",
          info.messageId
        );
        // 250 Requested mail action okay, completed
        res.status(250).json({
          success: true,
          message: `Email send to ${array} successfully`,
        });
      });
    } catch (err) {
      console.log("err in coll reg", err);
    }

    // here dont send res as it gives cant set headers after they're sent to the client
    // res.status(200).json({success: true,message: `Email send to ${array} successfully`,});
    // res.status(201).send({ success: true, message: "All Students Registered Successfully." });
  } catch (err) {
    // const errors = handleErrors(err);
    res.status(400).json({ errors, success: false });
    // console.log('err in last clasuse', err)
  }
};

module.exports.get_company = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res
        .status(400)
        .json({ success: false, message: "Company Not Found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Company Found", data: company });
  } catch (err) {
    res.status(400).json({ errors: err, success: false });
  }
};

module.exports.get_company_jobs = async (req, res) => {
  try {
    const companyList = await Company.find().populate({
      path: "jobDescriptions",
    });
    res.status(200).json({
      success: true,
      message: "current companies drive",
      data: companyList,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while getting the company jobs",
    });
  }
};

module.exports.get_student = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).populate("applications");
    if (!student) {
      return res
        .status(400)
        .json({ success: false, message: "Student Not Found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Student Found", data: student });
  } catch (err) {
    res.status(400).json({ errors: err, success: false });
  }
};

module.exports.get_all_students = async (req, res) => {
  try {
    const studentList = await Student.find();
    return res
      .status(200)
      .json({ success: true, message: "Student List", data: studentList });
  } catch (err) {
    res.status(400).json({ errors: err, success: false });
  }
};

module.exports.get_dashboard_details = async (req, res) => {
  try {
    const companyList = await Company.find();
    const jobList = await Job.find();
    console.log("joblist", jobList);
    const dashboard_details = {
      totalStudents: (await Student.find()).length,
      placedStudents: (
        await Student.find({
          $or: [
            { "LTE20.status": { $eq: true } },
            { "GT20.status": { $eq: true } },
          ],
        })
      ).length,
      unplacedStudents: 0,
      totalCompanies: companyList.length,
      averageCTC: 0,
    };

    dashboard_details.unplacedStudents =
      dashboard_details.totalStudents - dashboard_details.placedStudents;

    let sumOfCTC = 0;
    // * do not use parseInt here as it will give only integer values not decimal values
    // for (const company of companyList) {
    //   sumOfCTC += company.ctc;
    // }
    for (const job of jobList) {
      sumOfCTC += job.ctc;
    }
    console.log("sumOfCTC: ", sumOfCTC);
    dashboard_details.averageCTC = sumOfCTC / companyList.length;
    res.status(200).json({ success: true, dashboard_details });
  } catch (err) {
    res.status(400).json({ errors: err, success: false });
  }
};

module.exports.get_job_round_applied_students = async (req, res) => {
  try {
    const { jobId, roundNo } = req.body;
    Job.findById(jobId)
      .populate({ path: "jobApplications" })
      .exec(async function (err, job) {
        const studentIds = [];
        job.jobApplications.map((application) => {
          if (application.studentRoundCleared >= roundNo - 1) {
            studentIds.push(application.studentId);
          }
        });
        const data = await Student.find({ _id: { $in: studentIds } });
        res.status(200).json({
          success: true,
          data,
          message: `Applied Students of Round ${roundNo}.`,
        });
      });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while getting Applied Students",
    });
  }
};

module.exports.get_job_round_qualified_students = async (req, res) => {
  try {
    const { jobId, roundNo } = req.body;
    Job.findById(jobId)
      .populate({ path: "jobApplications" })
      .exec(async function (err, job) {
        const studentIds = [];
        job.jobApplications.map((application) => {
          if (application.studentRoundCleared >= roundNo) {
            studentIds.push(application.studentId);
          }
        });
        const data = await Student.find({ _id: { $in: studentIds } });
        res.status(200).json({
          success: true,
          data,
          message: `Qualified Students of Round ${roundNo}.`,
        });
      });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while getting Disqualified Students",
    });
  }
};

module.exports.get_job_round_disqualified_students = async (req, res) => {
  try {
    const { jobId, roundNo } = req.body;
    Job.findById(jobId)
      .populate({ path: "jobApplications" })
      .exec(async function (err, job) {
        const studentIds = [];
        job.jobApplications.map((application) => {
          if (
            application.studentRoundCleared == roundNo - 1 &&
            application.studentResult == false
          ) {
            studentIds.push(application.studentId);
          }
        });
        const data = await Student.find({ _id: { $in: studentIds } });
        res.status(200).json({
          success: true,
          data,
          message: `Disqualified Students of Round ${roundNo}.`,
        });
      });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while getting Disqualified Students",
    });
  }
};

//
//Generate placed student Report list,excel:

module.exports.get_placed_students = async (req, res) => {
  // const dept = req.query.Dept;

  // let students;
  // if (dept == "all") {
  //   students = await Student.find({ $or: [{ isLTE20: { $eq: true } }, { isGT20: { $eq: true } }]});
  // } else {
  //   // students = await Student.find({ branch: { $eq: dept } });
  //   students = await Student.find(
  //     {
  //       $and: [
  //         { branch: { $eq: dept } },
  //         { $or: [{ isLTE20: { $eq: true } }, { isGT20: { $eq: true } }] }
  //       ]
  //     }
  //   );
  // }

  let students = await Student.find({
    $or: [{ "LTE20.status": { $eq: true } }, { "GT20.status": { $eq: true } }],
  });

  if (!students) {
    return res
      .status(404)
      .json({ success: false, message: "No Student Found!" });
  }

  return res
    .status(200)
    .json({ success: true, message: "List of students", data: students });
};

// generate report
module.exports.generate_report = async (req, res) => {
  try {
    const reportArr = [];

    let jobs = await Job.find().populate("getCompany");

    for (let i = 0; i < jobs.length; i++) {
      let job = jobs[i];
      let obj = {};
      // console.log(jobs[i]);
      const company = await Company.findById(job.companyId);
      obj.companyName = company.name;

      const cgpa = job.criteria.engCgpa ? job.criteria.engCgpa : "NC";

      // todo UG and PG => branch criteria

      let UG = {};
      // const companywisePlacedStudentList = await
    }

    res.send({ success: "true" });
  } catch (err) {
    console.log("Error in generating report:", err);
  }
};

module.exports.student_application_delete = async (req, res) => {
  try {
    const applicationId = req.params.applicationId;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    await application.remove();

    res.status(200).json({
      success: true,
      message: "Application Deleted Successfully.",
    });
  } catch (err) {
    console.log("err in outermost try catch", err);
    res.status(400).json({
      success: false,
      message: "Error while Deleting Application.",
    });
  }
};
