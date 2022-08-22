const Student = require("../models/student");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Company = require("../models/company");
const Job = require("../models/job");
const Application = require("../models/application");
const Resume = require("../models/resume");
const crypto = require("crypto");
const nodeMailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const { createToken } = require("../utils/createToken");
const maxAge = 3 * 24 * 60 * 60;

let upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      // ** code for making directory using job ID make sure to change schema of file.js
      let jobId = req.params.jobId;
      let job = await Job.findById(jobId);
      if (!job) {
        throw Error("Job cannot be found.");
      }
      req.job = job;
      let companyId = job.companyId;
      let company = await Company.findById(companyId);
      if (!company) {
        throw Error("Company cannot be found!");
      }
      req.company = company;
      let companyName = company.name;
      let jobName = job.name;
      let path = `./uploads/${companyName}/${jobName}`;
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      cb(null, path);
    },
    filename: async (req, file, cb) => {
      //  ** with student auth Code
      let studentId = req.student._id;
      let student = await Student.findById(studentId);
      if (!student) {
        throw Error("Student cannot be found!");
      }
      let filename = student.pictRegistrationId;
      req.filename = filename;
      cb(null, filename + path.extname(file.originalname));
    },
  }),
}).single("resume");

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

const tokenAge = parseInt(process.env.JWT_AGE);

// login student
module.exports.login_student = async (req, res) => {
  const { email, password } = req.body;
  try {
    const student = await Student.login(email, password);
    const token = createToken(student._id);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
    }); // 3 days
    res.status(200).json({ student, usertype: "student", token, success: true });
  } catch (err) {
    const error = handleErrors(err);
    res.status(400).json({ success: false, error: error });
  }
};

// logout student
module.exports.logout_student = (req, res) => {
  req.student._id = "";
  res.cookie("token", "", { maxAge: 1 });
  res.cookie("usertype", "", { maxAge: 1 });
  res.send({ success: true, message: "Student Logged Out." });
};

// student profile
module.exports.student_profile = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id).populate({
      path: "applications"
    });
    if (!student) {
      return res.status(400).json({ success: false, message: "Student not found" });
    }
    res.status(200).json({ student, success: true });
  } catch {
    res.status(400).json({ success: false, message: "Login or Signup" });
  }
};

module.exports.drive_compaines = async (req, res) => {
  try {
    // ! here dont add .exec IN ARROWS after populate, if you do then send the response inside exec function else companyList will be undefined, so better not to use exec function here
    const companyList = await Company.find().populate({
      path: "jobDescriptions",
    });
    console.log("company list", companyList);
    res.status(200).json({
      success: true,
      message: "current companies drive",
      data: companyList,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Error while get company list" });
  }
};

module.exports.check_eligiblity = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // todo: checking eligible before making student's application
    // * Criteria order
    // * 1. check branch - DONE
    // * 2. Course - ug/pg - DONE
    // * 3. Gender - DONE
    // * 4. SSC percentage - SSC DONE, 
    // ! HSC REMAINS
    // * 5. End date (last date of application) Criteria - DONE WITH BACKEND, CHECK WITH FRONTEND
    // * 6. Amcat criteria - DONE
    // * 7. Attendance Criteria - DONE
    // * 8. CGPA criteria - DONE

    const eligiblity = {
      status: true,
      newApplication: true,
      course: true,
      branch: true,
      gender: true,
      sscPercentage: true,
      endDate: true,
      amcatScore: true,
      attendance: true,
      aggrCgpa: true,
      activeBacklog: true,
      passiveBacklog: true,
    }

    const student = await Student.findById(req.student._id);

    const studentAlreadyApplied = await Application.findOne({
      $and: [{ studentId: req.student._id }, { jobId: req.params.jobId }],
    });

    if (studentAlreadyApplied) {
      eligiblity.newApplication = false;
    }

    // * checking course - true for pg
    let companyCriteriaCourse;
    if ((!job.criteria.pg.cs && !job.criteria.pg.it && !job.criteria.pg.entc) && (job.criteria.ug.cs || job.criteria.ug.it || job.criteria.ug.entc)) {
      companyCriteriaCourse = "UG";
    }
    else if ((job.criteria.pg.cs || job.criteria.pg.it || job.criteria.pg.entc) && (!job.criteria.ug.cs && !job.criteria.ug.it && !job.criteria.ug.entc)) {
      companyCriteriaCourse = "PG";
    }
    else {
      companyCriteriaCourse = "ALL";
    }

    if (companyCriteriaCourse != "ALL") {
      if ((student.isUg && (companyCriteriaCourse == "PG") || (!student.isUg && (companyCriteriaCourse == "UG")))) {
        eligiblity.course = false;
        eligiblity.status = false;
      }
    }

    // * branch checking

    let applicableBranchArray = [];
    let csApplicable, itApplicable, entcApplicable;
    if (student.isUg) {
      csApplicable = job.criteria.ug.cs;
      if (csApplicable) applicableBranchArray.push("cs");
      itApplicable = job.criteria.ug.it;
      if (itApplicable) applicableBranchArray.push("it");
      entcApplicable = job.criteria.ug.entc;
      if (entcApplicable) applicableBranchArray.push("entc");
    } else {
      csApplicable = job.criteria.pg.cs;
      if (csApplicable) applicableBranchArray.push("cs");
      itApplicable = job.criteria.pg.it;
      if (itApplicable) applicableBranchArray.push("it");
      entcApplicable = job.criteria.pg.entc;
      if (entcApplicable) applicableBranchArray.push("entc");
    }

    if (!applicableBranchArray.includes(student.branch)) {
      eligiblity.branch = false;
      eligiblity.status = false;
    }

    // * Gender criteria checking
    const studentGender = student.gender;
    const maleApplicable = job.criteria.gender.male;
    const femaleApplicable = job.criteria.gender.female;
    const bothApplicable = job.criteria.gender.both;

    if (!bothApplicable) {
      if (studentGender == "female") {
        if (!femaleApplicable) {
          eligiblity.gender = false;
              eligiblity.status = false;
        }
      } else if (studentGender == "male") {
        if (!maleApplicable) {
          eligiblity.gender = false;
              eligiblity.status = false;
        }
      }
    }

    // * checking SSC percentage
    // ! HSC % checking remains as WDKT student has done hsc or diploma and company criteria are
    const studentSscPercentage = student.sscPercentage;

    if (studentSscPercentage < job.criteria.sscPercentage) {
      eligiblity.sscPercentage = false;
      eligiblity.status = false;
    }

    // * checking End date (last date of application) Criteria
    // ! Note -  new Date(kolkata....).... will give date-time in dd/mm/yyyy ss:mm:hh format
    // ! so to convert it into mongoose format for checking create another function new DatetodaysDate) which will give mongoose format YYYY-MM-DDTHH:MM:SS.SSSZ
    // var todaysDate = new Date().toLocaleString("en-US", {
    //   timeZone: "Asia/Kolkata",
    // });
    var todaysDate = new Date();
    console.log('todaysDate', todaysDate);
    // * above todaysDate is in object type, convert it into ISOStrig type not string(thurs 21 august 2022) type
    todaysDate = todaysDate.toISOString();
    let companyEndDate = job.endDate;
    let formattedCompanyEndDate = companyEndDate.toISOString();

    // *  todo : Check Date Criteria
    // ! careful with logic here
    if (formattedCompanyEndDate < todaysDate) {
      eligiblity.endDate = false;
      eligiblity.status = false;
    }

    // * checking amcat Criteria
    // ! note amcatScore is in job where amcatScore was in company
    if (job.criteria.amcatScore > student.amcatScore) {
      eligiblity.amcatScore = false;
      eligiblity.status = false;
    }

    // * checking attendance Criteria
    // ! note attendance is in job where attendance was in company
    if (job.criteria.attendance > student.attendance) {
      eligiblity.attendance = false;
      eligiblity.status = false;
    }

    if (job.criteria.aggrCgpa > student.aggrCgpa) {
      eligiblity.aggrCgpa = false;
      eligiblity.status = false;
    }

    if (job.criteria.activeBacklog < student.activeBacklog) {
      eligiblity.activeBacklog = false;
      eligiblity.status = false;
    }

    if (job.criteria.passiveBacklog < student.passiveBacklog) {
      eligiblity.passiveBacklog = false;
      eligiblity.status = false;
    }

    res.status(200).json({ success: true, data: eligiblity, message: "Eligible" });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ success: false, message: "Server Error" });
  }
}

module.exports.apply_company_job = async (req, res) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job) {
      return res.status(403).json({ success: false, message: "Job not found" });
    }

    const studentAlreadyApplied = await Application.findOne({
      $and: [{ studentId: req.student._id }, { jobId: req.body.jobId }],
    });

    if (studentAlreadyApplied) {
      return res
        .status(405)
        .json({ success: false, message: "Student already applied" });
    }

    await Application.create({
      jobId: req.body.jobId,
      studentId: req.student._id,
    });

    return res
      .status(201)
      .json({ success: true, message: "Application created successfully." });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ success: false, message: "Error while get company list" });
  }
};

// student reset Password
module.exports.student_reset_password = async (req, res) => {
  //passing in query not in params
  console.log("query", req.query);
  // console.log()

  const student = await Student.findOne({ _id: req.query.id });
  const isValid = await bcrypt.compare(
    req.query.token,
    student.resetPasswordToken
  );

  console.log("isValid", isValid);

  if (!isValid) {
    return res.status(400).json({
      success: false,
      msg: "Reset password token is invalid or has been expired",
    });
  }

  student.password = req.body.newPassword;
  student.resetPasswordToken = undefined;
  student.resetPasswordExpire = undefined;

  await student.save();

  //JWT_SECRET is a string -> parse it to integer
  const token = jwt.sign({ id: student._id }, process.env.JWT_SECRET, {
    expiresIn: parseInt(process.env.UPDATE_PASSWORD_AGE),
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
    student,
    token,
  });
};

module.exports.student_forgot_password = async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.body.email });

    if (!student) {
      return res.status(404).send("student not found");
    }

    // generating token
    const resetToken = crypto.randomBytes(32).toString("hex");

    //generates salt
    const salt = await bcrypt.genSalt(8);

    const resetPasswordToken = await bcrypt.hash(resetToken, salt);

    //storing HASHED password in student db, not token
    student.resetPasswordToken = resetPasswordToken;

    student.resetPasswordExpire = Date.now() + 15 * 60 * 1000; //15 minutes from now

    await student.save({ validateBeforeSave: false });
    // console.log('student after saving', student);
    // console.log("resetToken", resetToken);
    // now send email
    // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/resetPassword?token=${resetToken}&id=${user._id}`;
    const resetPasswordUrl = `http://localhost:3000/student/password/reset/${resetToken}/${student.id}`;

    // const message = `Your reset password token is:- \n\n <form action=${resetPasswordUrl} method="post">
    //     <input type="text" name="newPassword2" placeholder="Enter New password" />
    // <button type="submit">Click</button></form> \n\n If you have not requested this mail then please contact PICT TnP cell`;

    const message = `Your reset password token is:- \n\n <a href=${resetPasswordUrl}>click here</a> \n\n If you have not reque`;

    const transporter = nodeMailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    let info = await transporter.sendMail(
      {
        from: process.env.SMTP_SERVICE,
        to: student.email,
        subject: "Password Recovery checking 1",
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
          message: `Email send to ${student.email} successfully`,
        });
      }
    );

    // res.status(200).json({
    //   success: true,
    //   message: `Email send to ${student.email} successfully`,
    // });

    // console.log("Message sent: %s", info.messageId);
  } catch (error) {
    student.resetPasswordToken = undefined;
    student.resetPasswordToken = undefined;
    await student.save({ validateBeforeSave: false });
    console.log("error in student forgot pass", error);
  }
};

// student reset Password
module.exports.student_update_password = async (req, res) => {
  const student = await Student.findById(req.student._id);

  const isPasswordMatched = await bcrypt.compare(
    req.body.oldPassword,
    student.password
  );

  if (!isPasswordMatched) {
    return res.status(403).send("Passwords do not match");
  }

  // frontend compare newpassword with confirm password

  student.password = req.body.newPassword;

  await student.save();

  res.status(200).json({ success: true, message: "Password Updated." });
};

module.exports.resume_upload = async (req, res) => {
  upload(req, res, async () => {
    try {
      const resumeexists = await Resume.find({
        studentId: req.student._id,
        companyId: req.company._id,
        jobId: req.job._id,
      });
      console.log(resumeexists);
      if (resumeexists.length == 0) {
        const resume = await Resume.create({
          studentId: req.student._id,
          companyId: req.company._id,
          jobId: req.job._id,
          file_path: `./uploads/${req.company.name}/${req.job.name}/${req.filename}.pdf`,
        });
        console.log(resume);
        res.status(201).json({
          success: true,
          message: "Resume uploaded Successfully",
          resume,
        });
      } else {
        res.status(201).json({
          success: true,
          message: "Resume updated Successfully",
          resume: resumeexists[0],
        });
      }
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
      // ** code for resume-upload using student authentication middleware
      if (
        fs.existsSync(
          `./uploads/${req.company.name}/${req.job.name}/${req.filename}.pdf`
        )
      ) {
        fs.unlink(
          `./uploads/${req.company.name}/${req.job.name}/${req.filename}.pdf`
        );
      }
    }
  });
};

module.exports.company_details = async (req, res) => {
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

module.exports.get_applied_jobs = async (req, res) => {
  try {
    Student.findById(req.student._id).populate("applications").exec(async function (err, student) {
      if (err) {
        return res.status(400).json({ errors: err, success: false, message: "Error while getting applied jobs" });
      }
      const applicationIds = student.applications.map((application) => application._id.toString());
      const applications = await Application.find({ _id: { $in: applicationIds } }).populate({ path: 'job', populate: { path: 'company' } });
      res.status(200).json({ success: true, data: applications, message: "Applied Jobs" })
    });
  }
  catch (err) {
    res.status(400).json({ errors: err, success: false, message: "Error while getting applied jobs" });
  }
}

module.exports.delete_application = async (req, res) => {
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
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Deleting Application.",
    });
  }
}

// get Job Details
module.exports.get_job_details = async (req, res) => {
  try {
    let job = await Job.findById(req.params.jobId).populate("company");
    if (!job) {
      return res.status(404).json({ succss: false, message: "Job not found" })
    }
    res.status(200).json({
      success: true,
      data: job,
      message: "Job & Company found"
    })
  } catch (err) {
    console.log(err);
    res.status(404).json({ succss: false, message: "Job not found" })
  }
}