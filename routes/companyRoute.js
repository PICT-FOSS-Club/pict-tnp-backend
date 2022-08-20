const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const companyController = require("../controllers/companyController");

const router = new express.Router();

// add company 
router.post("/company/add", authAdmin, companyController.add_company);

// update company
router.post("/company/update", authAdmin, companyController.update_company);

// delete company
router.delete("/company/delete", authAdmin, companyController.delete_company);

// add company job
router.post("/company/job/add", authAdmin, companyController.add_job);

// update company job
router.post("/company/job/update", authAdmin, companyController.update_job);

// delete company job
router.post("/company/job/delete", authAdmin, companyController.delete_job);

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

// post company round results
// router.post("/company/round/result", authAdmin, companyController.rounds_result);

module.exports = router;