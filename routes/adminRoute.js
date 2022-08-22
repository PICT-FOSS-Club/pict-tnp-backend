const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const adminController = require("../controllers/adminController");

const router = new express.Router();

// login admin
router.post("/admin/signup", adminController.signup_admin);

// login admin
router.post("/admin/login", adminController.login_admin);

// logout admin
router.post("/admin/logout", authAdmin, adminController.logout_admin);

// update password for admin:
router.post("/admin/password/update", authAdmin, adminController.admin_update_password);

// reset student password
router.post("/admin/password/reset", adminController.admin_reset_password);

// forgot passwords
router.post("/admin/password/forgot", adminController.admin_forgot_password);

// signup a single student
router.post("/admin/register/student", authAdmin, adminController.register_student);

// signup students
router.post("/admin/register/students", authAdmin, adminController.register_students);

// get a company job
router.get("/admin/company/job/details/:jobId", authAdmin, adminController.get_job);

// get all companies
router.get("/admin/company/jobs", authAdmin, adminController.get_company_jobs);

// get a student
router.get("/admin/student/profile/:studentId", authAdmin, adminController.get_student);

// get all companies
router.get("/admin/student/all", authAdmin, adminController.get_all_students);

// get dashboard details
router.get("/admin/dashboard/details", authAdmin, adminController.get_dashboard_details);

// get Applied Students of a Job for Particular Round
router.get("/admin/company/applied", authAdmin, adminController.get_job_round_applied_students);

// get qualified students for a round of a  job
router.get("/admin/company/qualified", authAdmin, adminController.get_job_round_qualified_students);

// get disqualified students for a round of a  job
router.get("/admin/company/disqualified", authAdmin, adminController.get_job_round_disqualified_students);

// Get Placed students list,excel:
router.get("/admin/student/placed", authAdmin, adminController.get_placed_students);

// Report Generation
router.get("/admin/student/report/generate", authAdmin, adminController.generate_report);

// delete application of a student
router.delete("/admin/student/application/delete/:applicationId", authAdmin, adminController.student_application_delete);

module.exports = router;
