// backend/routes/commentRoutes.js
const express       = require('express');
const router        = express.Router();
const cCtrl         = require('../controllers/commentController');
const authJWT       = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

router.use(authJWT);
router.get   ('/pending',          hasPermission('comments:moderate'), cCtrl.getPending);
router.put   ('/:id/approve',      hasPermission('comments:moderate'), cCtrl.approve);
router.delete('/:id',              hasPermission('comments:delete'),   cCtrl.remove);

module.exports = router;
