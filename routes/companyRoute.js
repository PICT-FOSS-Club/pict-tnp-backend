const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const companyController = require("../controllers/companyController");

const router = new express.Router();

// add company 
router.post("/company/add", authAdmin, companyController.add_company);

// add company job
router.post("/company/job/add", authAdmin, companyController.add_job);

// update company drive
router.post("/company/drive/update", authAdmin, companyController.drive_update);

// post company round results
router.post("/company/round/result", authAdmin, companyController.rounds_result);

module.exports = router;