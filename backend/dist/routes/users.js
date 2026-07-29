"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const validation_1 = require("../middleware/validation");
const authValidator_1 = require("../validators/authValidator");
const router = (0, express_1.Router)();
// Protect all routes below
router.use(auth_1.protect);
router.post('/apply-driver', upload_1.upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'licenceImage', maxCount: 1 },
    { name: 'rcImage', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 },
]), authController_1.applyDriver);
router.put('/profile', (0, validation_1.validateRequest)(authValidator_1.updateProfileSchema), userController_1.updateProfile);
router.post('/avatar', upload_1.upload.single('avatar'), userController_1.uploadAvatar);
router.get('/blocked', userController_1.getBlocklist);
router.post('/block/:id', userController_1.blockUser);
router.post('/unblock/:id', userController_1.unblockUser);
router.post('/report/:id', userController_1.reportUser);
router.get('/:id', userController_1.getUserProfile);
exports.default = router;
