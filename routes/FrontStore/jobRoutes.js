const express = require('express');
const router = express.Router();
const jobController = require('../../controllers/FrontStore/jobController');
const authJWT = require('../../middlewares/authJWT');

// Public routes (for frontend)
router.get('/active', jobController.getActive);

// Admin routes (temporarily without auth for development)
// TODO: Add proper admin authentication
// router.use(authJWT); // Apply authentication to all routes below

// Get all jobs with pagination and filters
router.get('/', jobController.getAll);

// Get job by ID
router.get('/:id', jobController.getById);

// Create new job
router.post('/', jobController.create);

// Update job
router.put('/:id', jobController.update);

// Delete job
router.delete('/:id', jobController.delete);

// Reorder jobs
router.post('/reorder', jobController.reorder);

module.exports = router;
