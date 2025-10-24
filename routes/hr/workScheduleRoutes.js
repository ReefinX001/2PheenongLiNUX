// routes/hr/workScheduleRoutes.js
const express = require('express');
const router = express.Router();
const workScheduleController = require('../../controllers/hr/workScheduleController');
const authJWT = require('../../middlewares/authJWT');
const { rateLimiters, validateInput } = require('../../middlewares/security');

// Apply authentication and security middleware
router.use(authJWT);
router.use(validateInput);
router.use(rateLimiters.general);

// Work schedule routes
router.get('/', workScheduleController.getAllWorkSchedules);
router.get('/templates', workScheduleController.getWorkScheduleTemplates);
router.get('/user/:userId/active', workScheduleController.getUserActiveSchedule);
router.get('/:id', workScheduleController.getWorkScheduleById);

router.post('/', rateLimiters.modify, workScheduleController.createWorkSchedule);
router.post('/clone/:templateId', rateLimiters.modify, workScheduleController.cloneFromTemplate);

router.put('/:id', rateLimiters.modify, workScheduleController.updateWorkSchedule);
router.delete('/:id', rateLimiters.modify, workScheduleController.deleteWorkSchedule);

module.exports = router;