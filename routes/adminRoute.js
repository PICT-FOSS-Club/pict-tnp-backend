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
router.post(
  "/admin/password/update",
  authAdmin,
  adminController.admin_update_password
);

// reset student password
router.post("/admin/password/reset", adminController.admin_reset_password);

// forgot passwords
router.post("/admin/password/forgot", adminController.admin_forgot_password);

// signup a single student
router.post( "/admin/register/student", authAdmin, adminController.register_student);

// signup students
router.post( "/admin/register/students", authAdmin, adminController.register_students);

// get a company
router.get( "/admin/company/details/:companyId", authAdmin, adminController.get_company);

// get all companies
router.get("/admin/company/all", authAdmin, adminController.get_all_companies);

// get a student
router.get(
  "/admin/student/profile/:studentId",
  authAdmin,
  adminController.get_student
);

// get all companies
router.get("/admin/student/all", authAdmin, adminController.get_all_students);

// get dashboard details
router.get(
  "/admin/dashboard/details",
  authAdmin,
  adminController.get_dashboard_details
);

// get round{num} applied students for a company
// router.get("/admin/company/applied/:number/:companyId", authAdmin, adminController.get_company_round_applied_students);
router.get("/admin/company/applied/:number/:jobId", authAdmin, adminController.get_company_round_applied_students);

// get round{num} qualified students for a company
// router.get( "/admin/company/qualified/:number/:companyId", authAdmin, adminController.get_company_round_qualified_students);
router.get( "/admin/company/qualified/:number/:jobId", authAdmin, adminController.get_company_round_qualified_students);

// get round{num} disqualified students for a company
// router.get( "/admin/company/disqualified/:number/:companyId", authAdmin, adminController.get_company_round_disqualified_students);
router.get( "/admin/company/disqualified/:number/:jobId", authAdmin, adminController.get_company_round_disqualified_students);

// Get Placed students list,excel:
router.get("/admin/student/placed", authAdmin, adminController.get_placed_students);

// Report Generation
router.get("/admin/student/report/generate", authAdmin, adminController.generate_report);

// delete application of a student
router.delete("/admin/student/application/delete/:applicationId", authAdmin, adminController.student_application_delete);

module.exports = router;
