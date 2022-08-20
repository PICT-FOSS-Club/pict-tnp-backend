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

const handleErrors = (err) => {
  let errors = { name: "", phone: "", email: "", password: "" };

  // incorrect email
  if (err.message === "Incorrect Email") {
    errors.email = "This email is not registered";
  }

  // incorrect password
  if (err.message === "Incorrect Password") {
    errors.password = "This password is not registered";
  }

  // duplicate error code
  if (err.code == 11000) {
    errors.email = "that email existed earlier";
  }

  // validation errors
  if (err.message.includes("Student validation failed")) {
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
    let token;
    // const student = await Student.login(email, password);
    const student = await Student.findOne({ email: email }).populate({
      path: "applications",
    });
    if (student) {
      const isMatch = await bcrypt.compare(password, student.password);
      // token = createToken(student._id);
      token = await student.generateAuthToken();
      const usertype = "student";
      if (isMatch) {
        res.cookie("token", token, {
          httpOnly: true,
          maxAge: tokenAge * 1000,
          expires: new Date(Date.now() + 2483000000),
        }); //30 days expiry
        res.status(200).send({ student, token, success: true });
      } else {
        res.status(400).json({ error: "invalid creds" });
      }
    } else {
      res.status(400).json({ error: "invalid creds" });
    }
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors, success: false });
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
      path: "applications",
    });
    res.status(200).json({ student, success: true });
  } catch {
    res.status(400).json({ success: false, message: "Login or Signup" });
  }
};

module.exports.drive_compaines = async (req, res) => {
  try {
    const date = new Date().toISOString();
    // ! here dont add .exec after populate, if you do then send the response inside exec function else companyLost will be undefined, so better not to use exec function here
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

module.exports.apply_company = async (req, res) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job) {
      return res.status(403).json({ success: false, message: "Job not found" });
    }

    const student = await Student.findById(req.student._id);

    const studentAlreadyApplied = await Application.findOne({
      $and: [{ studentId: req.student._id }, { jobId: req.body.jobId }],
    });

    if (studentAlreadyApplied) {
      return res
        .status(403)
        .json({ success: false, message: "Student already applied" });
    }

    // todo: checking eligible before making student's application
    // * Criteria order
    // * 1. check branch - DONE
    // * 2. Course - ug/pg - DONE
    // * 3. Gender - DONE
    // ! 4. HSC & SSC percentage - SSC DONE, HSC REMAINS
    // ! 5. End date (last date of application) Criteria - DONE WITH BACKEND, CHECK WITH FRONTEND
    // * 6. Amcat criteria - DONE
    // * 7. Attendance Criteria - DONE
    // * 8. CGPA criteria - DONE

    let canApply = true;

    // * branch checking

    let applicableBranchArray = [];
    const csApplicable = job.criteria.branch.cs;
    if (csApplicable) applicableBranchArray.push("cs");
    const itApplicable = job.criteria.branch.it;
    if (itApplicable) applicableBranchArray.push("it");
    const entcApplicable = job.criteria.branch.entc;
    if (entcApplicable) applicableBranchArray.push("entc");

    // console.table(applicableBranchArray);

    if (!applicableBranchArray.includes(student.branch)) {
      canApply = false;
    }
    console.log("canapply after branch cheking", canApply);

    // * checking course
    const companyCriteriaCourse = job.criteria.courseName.ug;

    if (companyCriteriaCourse !== student.isUg) {
      canApply = false;
    }
    console.log("canapply after course cheking", canApply);

    // * Gender criteria checking
    const studentGender = student.gender;
    const maleApplicable = job.criteria.gender.male;
    const femaleApplicable = job.criteria.gender.female;
    const bothApplicable = job.criteria.gender.both;

    console.table(job.criteria.gender);

    if (!bothApplicable) {
      if (studentGender == "female") {
        if (!femaleApplicable) {
          canApply = false;
        }
      } else if (studentGender == "male") {
        if (!maleApplicable) {
          canApply = false;
        }
      }
    }
    console.log("canapply after gender cheking", canApply);

    // * checking SSC percentage
    // ! HSC % checking remains as WDKT student has done hsc or diploma and company criteria are
    const studentSscPercentage = student.sscPercentage;

    if (studentSscPercentage < job.criteria.sscPercentage) {
      console.log(
        "ssc per:",
        studentSscPercentage,
        " , company requirement",
        job.criteria.sscPercentage
      );
      canApply = false;
    }
    console.log("canapply after ssc cheking", canApply);

    // * checking End date (last date of application) Criteria
    var today = new Date();
    // var todaysDate =
    //   today.getFullYear() +
    //   "-" +
    //   (today.getMonth() + 1) +
    //   "-" +
    //   today.getDate();

    // ! Note -  new Date(kolkata....).... will give date-time in dd/mm/yyyy ss:mm:hh format
    // ! so to convert it into mongoose format for checking create another function new DatetodaysDate) which will give mongoose format YYYY-MM-DDTHH:MM:SS.SSSZ
    var todaysDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    todaysDate = new Date(todaysDate);
    // * above todaysDate is in object type, convert it into ISOStrig type not string(thurs 21 august 2022) type
    todaysDate = todaysDate.toISOString();
    let companyEndDate = job.endDate;
    let formattedCompanyEndDate = companyEndDate.toISOString();
    console.log(
      "Todays date is:",
      todaysDate,
      " Companys end date is:",
      formattedCompanyEndDate
    );

    // *  todo : Check Date Criteria
    // ! careful with logic here
    if (formattedCompanyEndDate < todaysDate) {
      canApply = false;
    }
    console.log("canApply after end-date checking:", canApply);

    // * checking amcat Criteria
    // ! note requiredAmcatScore is in job where RequiredAmcatScore was in company
    if (job.criteria.requiredAmcatScore > student.AmcatScore) {
      canApply = false;
    }
    console.log("canApply after AMCAT checking:", canApply);

    // ! note requiredAttendance is in job where RequiredAttendance was in company
    // if (job.criteria.requiredAttendance > student.attendance) {
    //   canApply = false;
    // }
    // console.log("canApply after attendance checking:", canApply);

    if (job.criteria.engCgpa > student.aggrCgpa) {
      canApply = false;
    }
    console.log("canApply after aggr.CGPA checking:", canApply);

    if (canApply) {
      const application = await Application.create({
        jobId: req.body.jobId,
        studentId: req.student._id,
      });
      // student.applications.push({ applicationId: application._id });
      await student.save();
      return res
        .status(201)
        .json({ success: true, message: "Application created successfully." });
    } else {
      return res.status(403).json({
        success: false,
        message: "You can not apply for this company.",
      });
    }
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

  try {
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
        res
          .status(201)
          .json({
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

module.exports.company_detials = async (req, res) => {
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
