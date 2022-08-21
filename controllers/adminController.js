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
    const token = createToken(admin._id);
    res.cookie("token", token, { httpOnly: true, maxAge: maxAge * 1000 }); //3 days
    res.status(201).json({ admin, usertype: "admin", token, success: true });
  } catch (err) {
    const error = handleErrors(err);
    res.status(400).json({ error, success: false });
  }
};

// login admin
module.exports.login_admin = async (req, res) => {
  const { email, password } = req.body;
  try {
    let admin = await Admin.login(email, password);
    const token = createToken(admin._id);
    admin = await Admin.findById(admin);
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
// get Company Job
module.exports.get_job = async (req, res) => {
  try {
    let job = await Job.findById(req.params.jobId).populate("company");
    if(!job){
      return res.status(404).json({succss: false, message:"Job not found"})
    }
    res.status(200).json({
      success: true,
      data: job,
      message: "Job & Company found"
    })
  } catch (err) {
    console.log(err);
    res.status(404).json({succss: false, message:"Job not found"})
  }
}

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
    const dashboard_details = {
      totalStudents: 0,
      csPlacedStudents: 0,
      itPlacedStudents: 0,
      entcPlacedStudents: 0,
      totalCompanies: 0,
      placedStudents: 0,
      unplacedStudents: 0,
    };

    dashboard_details.totalStudents = (await Student.find()).length;
    dashboard_details.totalCompanies = (await Company.find()).length;
    dashboard_details.csPlacedStudents = (await Student.find({ 
      $and: [ 
        { 
          branch:  { $eq: "cs" } 
        },
        {$or: 
          [
            { "LTE20.status": { $eq: true} },
            { "GT20.status": { $eq: true} },
          ]
        }
      ]
    })).length;

    dashboard_details.itPlacedStudents = (await Student.find({ 
      $and: [ 
        { 
          branch:  { $eq: "it" } 
        },
        {$or: 
          [
            { "LTE20.status": { $eq: true} },
            { "GT20.status": { $eq: true} },
          ]
        }
      ]
    })).length;

    dashboard_details.entcPlacedStudents = (await Student.find({ 
      $and: [ 
        { 
          branch:  { $eq: "entc" } 
        },
        {$or: 
          [
            { "LTE20.status": { $eq: true} },
            { "GT20.status": { $eq: true} },
          ]
        }
      ]
    })).length;
    dashboard_details.placedStudents = (dashboard_details.csPlacedStudents + dashboard_details.itPlacedStudents + dashboard_details.entcPlacedStudents);
    dashboard_details.unplacedStudents = dashboard_details.totalStudents - dashboard_details.placedStudents;
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

    let jobs = await Job.find().populate("company");

    for (let i = 0; i < jobs.length; i++) {
      let job = jobs[i];
      let obj = {};
      let maleStudentsCount = 0;
      let femaleStudentsCount = 0;
      let totalStudentsCount = 0;
      let ugCsStudentsCount = 0;
      let ugItStudentsCount = 0;
      let ugEntcStudentsCount = 0;
      let pgCsStudentsCount = 0;
      let pgItStudentsCount = 0;
      let pgEntcStudentsCount = 0;
      // console.log(`job[${i + 1}]=>`, jobs[i]);
      let jobCriteriaUG = job.criteria.ug;
      let jobCriteriaPG = job.criteria.pg;
      let jobCriteriaGender = job.criteria.gender;
      const company = await Company.findById(job.companyId);
      obj.companyName = company.name;

      const cgpa = job.criteria.engCgpa ? job.criteria.engCgpa : "NC";
      obj.cgpa = cgpa;
      // todo UG and PG => branch criteria - handle(-ug and ce,it -pg)
      {

        // 1. all ug & pg
        if (jobCriteriaUG.cs && jobCriteriaUG.it && jobCriteriaUG.entc && jobCriteriaPG.cs && jobCriteriaPG.it && jobCriteriaPG.entc) {
          obj.branches = "All (UG and PG)";
        }
        // 2. all ug
        else if (jobCriteriaUG.cs && jobCriteriaUG.it && jobCriteriaUG.entc) {
          obj.branches = "All (UG)";
        }
        // 3. all PG
        else if (jobCriteriaPG.cs && jobCriteriaPG.it && jobCriteriaPG.entc) {
          obj.branches = "All (PG)";
        }
        // 4. all ug & pg(ce,it)
        else if (jobCriteriaUG.cs && jobCriteriaUG.it && jobCriteriaUG.entc && (jobCriteriaPG.cs || jobCriteriaPG.it || jobCriteriaPG.entc)) {
          obj.branches = "All (UG) and";
          if (jobCriteriaPG.cs) {
            obj.branches += " CE "
          }
          if (jobCriteriaPG.it) {
            obj.branches += " IT "
          }
          if (jobCriteriaPG.entc) {
            obj.branches += " ENTC "
          }
          obj.branches += "(PG)"
        }
        // all pg and ug(ce, it)
        else if ((jobCriteriaUG.cs || jobCriteriaUG.it || jobCriteriaUG.entc) && (jobCriteriaPG.cs && jobCriteriaPG.it && jobCriteriaPG.entc)) {
          obj.branches = "(";
          if (jobCriteriaUG.cs) {
            obj.branches += " CE "
          }
          if (jobCriteriaUG.it) {
            obj.branches += " IT "
          }
          if (jobCriteriaUG.entc) {
            obj.branches += " ENTC "
          }
          obj.branches += "- (UG) & ALL (PG)"
        }
        else {
          // 5. ug(ce,it) & pg(ce,it)
          obj.branches = "";
          if (jobCriteriaUG.cs) {
            obj.branches += " CE "
          }
          if (jobCriteriaUG.it) {
            obj.branches += " IT "
          }
          if (jobCriteriaUG.entc) {
            obj.branches += " ENTC "
          }
          obj.branches += "-(UG) & "
          if (jobCriteriaPG.cs) {
            obj.branches += " CE "
          }
          if (jobCriteriaPG.it) {
            obj.branches += " IT "
          }
          if (jobCriteriaPG.entc) {
            obj.branches += " ENTC "
          }
          obj.branches += "-(PG)"
        }
      }
      // const companywisePlacedStudentList = await
      // * salary 
      obj.salary = job.ctc

      // * visit date
      obj.visitDate = job.roundDetails[0].date;

      // * for finding no of placed students
      // await Applications.find({jobId: {$eq: job._id}}).populate("student").exec(async function(err, data){
      //   for(let i=0; i<data.length; i++){
      //     let student = data[i];
      //     let studentsList = (student.student);
      //     // if(student)
      //   }
      // })

      obj.male = 0
      obj.female = 0
      obj.total = 0
      obj.ugCsStudentsCount = 0
      obj.ugItStudentsCount = 0
      obj.ugEntcStudentsCount = 0
      obj.pgCsStudentsCount = 0
      obj.pgItStudentsCount = 0
      obj.pgEntcStudentsCount = 0
      // * for gt20
      if (job.ctc > 20) {
        // * for finding no of placed students and also forFor Female, Male & total
        const data = await Application.find({ jobId: { $eq: job._id } }).populate("student")
        // .exec(async function (err, data) {
          // if (err) {
            // return res.status(404).json({ success: false, message: "Application not found", errors: err })
            // console.log('err in totalAppliedForJob', err);
          // } else {
            // const maleStudents = await data.find();
            // console.log('male students',data[0])
        if(!data.length){
          console.log(`job ctc>20, but no this job does not have any application `,data);
        }else{

          for (let i = 0; i < data.length; i++) {
            let student = data[i];

            // console.log('student.gender',JSON.stringify(student.student));
            let studentsList = (student.student);
            // if(studentsList[0].gender == "male"){
            //   maleStudentsCount++;
            // }else{
            //   femaleStudentsCount++;
            // }
            // console.log('studentsList',studentsList[0].gender)
            // console.log('studentsList[0].LTE20.jobId == job._id for ',JSON.stringify(studentsList[0].LTE20.jobId)," ", JSON.stringify(job._id))
            if (studentsList[0].GT20.status && JSON.stringify(studentsList[0].GT20.jobId) === JSON.stringify(job._id)) {
              // console.log('studentsList[0].gender == male for ',JSON.stringify(studentsList[0].gender))
              if (studentsList[0].gender == "male") {
                maleStudentsCount++;
              } else {
                femaleStudentsCount++;
              }

              // * now checking for course and department
              if (studentsList[0].isUg) {
                // let ugCsStudentsCount = 0;
                // let ugItStudentsCount = 0;
                // let ugEntcStudentsCount = 0;
                if (studentsList[0].branch == "cs") {
                  ugCsStudentsCount++;
                } else if (studentsList[0].branch == "it") {
                  ugItStudentsCount++;
                } else if (studentsList[0].branch == "entc") {
                  ugEntcStudentsCount++;
                }
              } else {
                // let pgCsStudentsCount = 0;
                // let pgItStudentsCount = 0;
                // let pgEntcStudentsCount = 0;
                if (studentsList[0].branch == "cs") {
                  pgCsStudentsCount++;
                } else if (studentsList[0].branch == "it") {
                  pgItStudentsCount++;
                } else if (studentsList[0].branch == "entc") {
                  pgEntcStudentsCount++;
                }
              }
            }
            totalStudentsCount = maleStudentsCount + femaleStudentsCount;
          }
          // }
          // console.log('male students', maleStudentsCount, 'female students', femaleStudentsCount, 'total students count',totalStudentsCount)
          // console.log('ugCS', ugCsStudentsCount, 'ugIT', ugItStudentsCount, 'ugENTC',ugEntcStudentsCount)
          // console.log('pgCS', pgCsStudentsCount, 'pgIT', pgItStudentsCount, 'pgENTC',pgEntcStudentsCount)
          obj.male = maleStudentsCount
          obj.female = femaleStudentsCount
          obj.total = totalStudentsCount
          obj.ugCsStudentsCount = ugCsStudentsCount
          obj.ugItStudentsCount = ugItStudentsCount
          obj.ugEntcStudentsCount = ugEntcStudentsCount
          obj.pgCsStudentsCount = pgCsStudentsCount
          obj.pgItStudentsCount = pgItStudentsCount
          obj.pgEntcStudentsCount = pgEntcStudentsCount
          console.log('finalobj', obj)
          reportArr.push(obj)
        }
        // };
        // );

      } else {
        // * For Female, Male total
        const data = await Application.find({ jobId: { $eq: job._id } }).populate("student")
        // .exec(
          if(!data.length){
            console.log(`No applicants to this job`,data)
          }else{

              // async function (err, data) {
              // if (err) {
              //   console.log('err in totalAppliedForJob', err);
              // } else {
                // const maleStudents = await data.find();
                // console.log('male students',data[0])
                for (let i = 0; i < data.length; i++) {
                  let student = data[i];

                  // console.log('student.gender',JSON.stringify(student.student));
                  let studentsList = (student.student);
                  // if(studentsList[0].gender == "male"){
                  //   maleStudentsCount++;
                  // }else{
                  //   femaleStudentsCount++;
                  // }
                  // console.log('studentsList',studentsList[0].gender)
                  // console.log('studentsList[0].LTE20.jobId == job._id for ',JSON.stringify(studentsList[0].LTE20.jobId)," ", JSON.stringify(job._id))
                  if (!studentsList[0].GT20.status && studentsList[0].LTE20.status && JSON.stringify(studentsList[0].LTE20.jobId) === JSON.stringify(job._id)) {
                    // console.log('studentsList[0].gender == male for ',JSON.stringify(studentsList[0].gender))
                    if (studentsList[0].gender == "male") {
                      maleStudentsCount++;
                    } else {
                      femaleStudentsCount++;
                    }

                    // * now checking for course and department
                    if (studentsList[0].isUg) {
                      // let ugCsStudentsCount = 0;
                      // let ugItStudentsCount = 0;
                      // let ugEntcStudentsCount = 0;
                      if (studentsList[0].branch == "cs") {
                        ugCsStudentsCount++;
                      } else if (studentsList[0].branch == "it") {
                        ugItStudentsCount++;
                      } else if (studentsList[0].branch == "entc") {
                        ugEntcStudentsCount++;
                      }
                    } else {
                      // let pgCsStudentsCount = 0;
                      // let pgItStudentsCount = 0;
                      // let pgEntcStudentsCount = 0;
                      if (studentsList[0].branch == "cs") {
                        pgCsStudentsCount++;
                      } else if (studentsList[0].branch == "it") {
                        pgItStudentsCount++;
                      } else if (studentsList[0].branch == "entc") {
                        pgEntcStudentsCount++;
                      }
                    }
                  }
                  totalStudentsCount = maleStudentsCount + femaleStudentsCount;
                }
              // }
              // console.log('male students', maleStudentsCount, 'female students', femaleStudentsCount, 'total students count',totalStudentsCount)
              // console.log('ugCS', ugCsStudentsCount, 'ugIT', ugItStudentsCount, 'ugENTC',ugEntcStudentsCount)
              // console.log('pgCS', pgCsStudentsCount, 'pgIT', pgItStudentsCount, 'pgENTC',pgEntcStudentsCount)
              obj.male = maleStudentsCount
              obj.female = femaleStudentsCount
              obj.total = totalStudentsCount
              obj.ugCsStudentsCount = ugCsStudentsCount
              obj.ugItStudentsCount = ugItStudentsCount
              obj.ugEntcStudentsCount = ugEntcStudentsCount
              obj.pgCsStudentsCount = pgCsStudentsCount
              obj.pgItStudentsCount = pgItStudentsCount
              obj.pgEntcStudentsCount = pgEntcStudentsCount
              console.table(obj)
              reportArr.push(obj)
        }
          }
        // );
      // }
      // console.log(JSON.stringify(totalAppliedForJob))



    
    }
    // console.log(obj)
    res.send({ success: true, data: reportArr, message:"Placement Report Generated" });
  }catch (err) {
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
    res.status(400).json({
      success: false,
      error: err,
      message: "Error while Deleting Application.",
    });
  }
}