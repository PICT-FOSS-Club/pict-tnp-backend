const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const companyController = require("../controllers/companyController");

const router = new express.Router();

// post company drive
router.post("/company/drive", authAdmin, companyController.apply_drive);

// update company drive
router.post("/company/drive/update", authAdmin, companyController.drive_update);

// post company round results
router.post("/company/round/result", authAdmin, companyController.rounds_result);

module.exports = router;