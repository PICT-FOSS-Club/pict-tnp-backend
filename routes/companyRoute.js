const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const companyController = require("../controllers/companyController");

const router = new express.Router();

// add company
router.post("/company/add", authAdmin, companyController.add_company);

// upload company files
router.post("/company/files/:companyId", authAdmin, companyController.upload_company_files);

// update company
router.post("/company/update", authAdmin, companyController.update_company);

// delete company
router.delete("/company/delete/:id", authAdmin,companyController.delete_company);

// add company job
router.post("/company/job/add", authAdmin, companyController.add_job);

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

module.exports = router;
