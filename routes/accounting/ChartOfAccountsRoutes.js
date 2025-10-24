// routes/chartOfAccountsRoutes.js
const express = require('express');
const router = express.Router();
const chartOfAccountsController = require('../../controllers/chartOfAccountsController');

// /api/chart-of-accounts
router.get('/', chartOfAccountsController.getAll);
router.get('/:id', chartOfAccountsController.getById);
router.post('/', chartOfAccountsController.create);
router.patch('/:id', chartOfAccountsController.update);
router.delete('/:id', chartOfAccountsController.softDelete);

module.exports = router;
