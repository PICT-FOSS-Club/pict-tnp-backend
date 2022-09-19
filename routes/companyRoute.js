const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const companyController = require("../controllers/companyController");

const router = new express.Router();

// add company
router.post("/company/add", authAdmin, companyController.add_company);

// update company
router.post("/company/update", authAdmin, companyController.update_company);

// delete company
router.delete("/company/delete/:id", authAdmin, companyController.delete_company);

// add company job
router.post("/company/job/add", authAdmin, companyController.add_job);

// upload job file
router.post("/job/files/:companyId/:jobId", authAdmin, companyController.upload_job_files)
// update company job
router.post("/company/job/update", authAdmin, companyController.update_job);

// delete company job
router.delete("/company/job/delete/:id", authAdmin, companyController.delete_job);

// add company job round
router.post("/company/job/round/add", authAdmin, companyController.job_round_add);

// update company job round
router.post("/company/job/round/update", authAdmin, companyController.job_round_update);

// delete company job round
router.post("/company/job/round/delete", authAdmin, companyController.job_round_delete);

// declare company job round result
router.post("/company/job/round/result/declare", authAdmin, companyController.job_round_result_declare);

// update company job round result
router.post("/company/job/round/result/update", authAdmin, companyController.job_round_result_update);

// delete company job round result
// router.post("/company/job/round/result/delete", authAdmin, companyController.job_round_result_delete);

// get unplaced student's list for a particular job
router.get("/company/job/unplacedStudentsList/:jobId", authAdmin, companyController.get_all_unplaced_students)

// apply an uneligible student to a particular job
router.post("/company/job/apply/uneligible/:jobId/:studentId", authAdmin, companyController.apply_uneligible_student)

module.exports = router;
