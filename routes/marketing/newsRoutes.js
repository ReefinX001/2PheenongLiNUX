// backend/routes/newsRoutes.js
const express = require('express');
const router = express.Router();
const newsController = require('../../controllers/newsController');
// ถ้ามี middleware ยืนยันตัวตน ให้ import แล้วใส่หลัง router.<method>(authMiddleware, …)

router.get('/',           newsController.getAllNews);
router.get('/:id',        newsController.getNewsById);
router.post('/',          newsController.createNews);
router.put('/:id',        newsController.updateNews);
router.delete('/:id',     newsController.deleteNews);

module.exports = router;
