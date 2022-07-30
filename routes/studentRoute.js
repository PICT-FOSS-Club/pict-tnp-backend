const express = require("express");
const authStudent = require("../middlewares/authStudent");
const studentController = require("../controllers/studentController");

const router = new express.Router();

// login student
router.post("/student/login", studentController.login_student);

// logout student
router.post("/student/logout", authStudent, studentController.logout_student);

// student profile
router.get("/student/me", authStudent, studentController.student_profile);

// getCurrentlyOnGoinCompaniesDrive,
router.get("/student/company/drive", authStudent, studentController.drive_compaines);

// company details,
router.get("/student/company/details/:companyId", authStudent, studentController.company_detials);

// studentApplyForCompanies later - companyid take from req.body._id
router.post("/student/company/apply", authStudent, studentController.apply_company);

// reset student password
router.post("/student/password/reset", studentController.student_reset_password);

// forgot passwords
router.post("/student/password/forgot", studentController.student_forgot_password);

// update student password
router.post("/student/password/update", authStudent, studentController.student_update_password);

// resume upload
router.post("/student/resume/upload/:companyId", authStudent, studentController.resume_upload);

module.exports = router;
