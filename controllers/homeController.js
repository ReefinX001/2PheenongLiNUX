// controllers/homeController.js
const path = require('path');

exports.getHomePage = (req, res) => {
  // ส่งไฟล์ home.html กลับไป
  res.sendFile(path.join(__dirname, '../views/home.html'));
};
