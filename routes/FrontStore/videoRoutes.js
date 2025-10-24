const express = require('express');
const router = express.Router();

// Get video configuration
router.get('/', async (req, res) => {
  try {
    // Return default video configuration
    res.json({
      success: true,
      data: {
        title: 'กว่าจะมาเป็น 2 พี่น้อง โมบาย',
        subtitle: 'เรื่องราวและประสบการณ์ของเราในธุรกิจมือถือ',
        videoUrl: '/views/FrontStore/กว่าจะมาเป็น2พี่น้อง.mp4',
        poster: '',
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error loading video data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลวิดีโอ',
      error: error.message
    });
  }
});

// Update video configuration
router.post('/', async (req, res) => {
  try {
    const { title, subtitle, videoUrl, poster, isActive } = req.body;

    // For now, just return success
    res.json({
      success: true,
      message: 'อัปเดตข้อมูลวิดีโอสำเร็จ',
      data: {
        title: title || 'กว่าจะมาเป็น 2 พี่น้อง โมบาย',
        subtitle: subtitle || 'เรื่องราวและประสบการณ์ของเราในธุรกิจมือถือ',
        videoUrl: videoUrl || '/views/FrontStore/กว่าจะมาเป็น2พี่น้อง.mp4',
        poster: poster || '',
        isActive: isActive !== undefined ? isActive : true
      }
    });
  } catch (error) {
    console.error('Error updating video data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลวิดีโอ',
      error: error.message
    });
  }
});

module.exports = router;
