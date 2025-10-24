const ContactLocation = require('../../models/FrontStore/ContactLocation');

const contactLocationController = {
  // Get all contact locations
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, isActive } = req.query;

      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ];
      }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const skip = (page - 1) * limit;
      const total = await ContactLocation.countDocuments(query);
      const locations = await ContactLocation.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: locations,
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching contact locations:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขา',
        error: error.message
      });
    }
  },

  // Get active contact locations (for public use)
  getActive: async (req, res) => {
    try {
      const locations = await ContactLocation.find({ isActive: true })
        .sort({ order: 1, createdAt: -1 });

      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Error fetching active contact locations:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขา',
        error: error.message
      });
    }
  },

  // Get contact location by ID
  getById: async (req, res) => {
    try {
      const location = await ContactLocation.findById(req.params.id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสาขา'
        });
      }

      res.json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Error fetching contact location:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขา',
        error: error.message
      });
    }
  },

  // Create new contact location
  create: async (req, res) => {
    try {
      console.log('Received contact location data:', req.body);
      const locationData = req.body;

      // Convert string booleans to actual booleans if needed
      if (locationData.isActive !== undefined && typeof locationData.isActive === 'string') {
        locationData.isActive = locationData.isActive === 'true';
      }

      console.log('Processed location data:', locationData);

      const location = new ContactLocation(locationData);
      const savedLocation = await location.save();

      res.status(201).json({
        success: true,
        message: 'สร้างข้อมูลสาขาสำเร็จ',
        data: savedLocation
      });
    } catch (error) {
      console.error('Error creating contact location:', error);
      res.status(400).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างข้อมูลสาขา',
        error: error.message
      });
    }
  },

  // Update contact location
  update: async (req, res) => {
    try {
      const locationData = req.body;

      // Convert string booleans to actual booleans if needed
      if (locationData.isActive !== undefined && typeof locationData.isActive === 'string') {
        locationData.isActive = locationData.isActive === 'true';
      }

      const location = await ContactLocation.findByIdAndUpdate(
        req.params.id,
        locationData,
        { new: true, runValidators: true }
      );

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสาขา'
        });
      }

      res.json({
        success: true,
        message: 'อัปเดตข้อมูลสาขาสำเร็จ',
        data: location
      });
    } catch (error) {
      console.error('Error updating contact location:', error);
      res.status(400).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลสาขา',
        error: error.message
      });
    }
  },

  // Delete contact location
  delete: async (req, res) => {
    try {
      const location = await ContactLocation.findByIdAndDelete(req.params.id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสาขา'
        });
      }

      res.json({
        success: true,
        message: 'ลบข้อมูลสาขาสำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting contact location:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบข้อมูลสาขา',
        error: error.message
      });
    }
  },

  // Reorder contact locations
  reorder: async (req, res) => {
    try {
      const { orders } = req.body; // Array of { id, order }

      if (!Array.isArray(orders)) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบข้อมูลไม่ถูกต้อง'
        });
      }

      // Update order for each location
      const updatePromises = orders.map(({ id, order }) =>
        ContactLocation.findByIdAndUpdate(id, { order }, { new: true })
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'จัดเรียงลำดับสาขาสำเร็จ'
      });
    } catch (error) {
      console.error('Error reordering contact locations:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการจัดเรียงลำดับ',
        error: error.message
      });
    }
  }
};

module.exports = contactLocationController;
