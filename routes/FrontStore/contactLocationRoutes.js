const express = require('express');
const router = express.Router();
const contactLocationController = require('../../controllers/FrontStore/contactLocationController');
const authJWT = require('../../middlewares/authJWT');

// Public routes (for frontend)
router.get('/active', contactLocationController.getActive);

// Admin routes (temporarily without auth for development)
// TODO: Add proper admin authentication
// router.use(authJWT); // Apply authentication to all routes below

// Get all contact locations with pagination and filters
router.get('/', contactLocationController.getAll);

// Get contact location by ID
router.get('/:id', contactLocationController.getById);

// Create new contact location
router.post('/', contactLocationController.create);

// Update contact location
router.put('/:id', contactLocationController.update);

// Delete contact location
router.delete('/:id', contactLocationController.delete);

// Reorder contact locations
router.post('/reorder', contactLocationController.reorder);

module.exports = router;
