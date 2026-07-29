"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const licenceController_1 = require("../controllers/licenceController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/', upload_1.upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
]), licenceController_1.uploadLicence);
router.get('/my-licence', licenceController_1.getMyLicence);
exports.default = router;
