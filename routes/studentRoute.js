const express = require("express");
const authStudent = require("../middlewares/authStudent");
const studentController = require("../controllers/studentController");
const JobFile = require("../models/jobFile");

const router = new express.Router();

// login student
router.post("/student/login", studentController.login_student);

// logout student
router.post("/student/logout", authStudent, studentController.logout_student);

// student profile
router.get("/student/me", authStudent, studentController.student_profile);

// get Currently On Going Company Jobs,
router.get(
  "/student/company/jobs",
  authStudent,
  studentController.drive_compaines
);

// company details,
router.get(
  "/student/company/details/:companyId",
  authStudent,
  studentController.company_details
);

// studentApplyForCompanies later - companyid take from req.body._id
router.post(
  "/student/company/job/apply",
  authStudent,
  studentController.apply_company_job
);

// Check Eligibility of Student
router.get(
  "/student/company/job/eligiblity/:jobId",
  authStudent,
  studentController.check_eligiblity
);

// reset student password
router.post(
  "/student/password/reset",
  studentController.student_reset_password
);

// forgot passwords
router.post(
  "/student/password/forgot",
  studentController.student_forgot_password
);

// update student password
router.post(
  "/student/password/update",
  authStudent,
  studentController.student_update_password
);

// resume upload
router.post(
  "/student/resume/upload/:jobId",
  authStudent,
  studentController.resume_upload
);

// get applied jobs details
router.get(
  "/student/company/job/applied",
  authStudent,
  studentController.get_applied_jobs
);

// delete application
router.delete(
  "/student/application/delete/:applicationId",
  authStudent,
  studentController.delete_application
);

// get a job details
router.get(
  "/student/job/details/:jobId",
  authStudent,
  studentController.get_job_details
);

// get a job details
router.get(
  "/student/job/files/:jobId",
  authStudent,
  studentController.get_job_file
);

module.exports = router;
