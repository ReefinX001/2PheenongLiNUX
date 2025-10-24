const Zone = require('../models/HR/zoneModel');

// Enhanced zone controller with better error handling and debugging

// GET /api/zone
exports.getAll = async (req, res) => {
  const io = req.app.get('io');

  try {
    console.log('📍 Zone getAll request from user:', req.user?.username);
    console.log('User permissions:', req.user?.permissions);

    // Add query optimization and error handling
    const zones = await Zone.find({ isActive: { $ne: false } })
      .limit(100)
      .lean()
      .catch(err => {
        console.error('Database query error:', err);
        throw new Error('Database connection failed');
      });

    console.log(`✅ Retrieved ${zones.length} zones successfully`);

    // Send Socket.IO notification for real-time updates
    if (io) {
      io.emit('zoneDataLoaded', {
        count: zones.length,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: zones,
      count: zones.length,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ getAll zones error:', err);

    // Send detailed error in development
    const errorResponse = {
      success: false,
      error: 'ไม่สามารถดึงข้อมูลพื้นที่ได้',
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = err.message;
      errorResponse.stack = err.stack;
    }

    res.status(500).json(errorResponse);
  }
};

// GET /api/zone/:id
exports.getOne = async (req, res) => {
  const io = req.app.get('io');

  try {
    console.log('📍 Zone getOne request:', req.params.id, 'from user:', req.user?.username);

    const zone = await Zone.findById(req.params.id).lean();

    if (!zone) {
      console.log('❌ Zone not found:', req.params.id);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบพื้นที่',
        id: req.params.id
      });
    }

    console.log('✅ Zone found:', zone.name);

    res.json({
      success: true,
      data: zone,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ getOne zone error:', err);

    // Handle invalid ObjectId
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid zone ID format',
        id: req.params.id
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error fetching zone',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// POST /api/zone
exports.create = async (req, res) => {
  const io = req.app.get('io');

  try {
    console.log('📍 Zone create request from user:', req.user?.username);
    console.log('Data:', req.body);

    const { name, center, radius, isActive = true } = req.body;

    // Validation
    if (!name || !center) {
      return res.status(400).json({
        success: false,
        error: 'Name and center are required',
        missing: {
          name: !name,
          center: !center
        }
      });
    }

    // Check for duplicate names
    const existingZone = await Zone.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingZone) {
      return res.status(409).json({
        success: false,
        error: 'Zone with this name already exists',
        existing: existingZone.name
      });
    }

    const zone = new Zone({
      name,
      center,
      radius,
      isActive,
      createdBy: req.user?.id,
      createdAt: new Date()
    });

    const savedZone = await zone.save();

    console.log('✅ Zone created:', savedZone.name);

    // Real-time notification
    if (io) {
      io.emit('zoneCreated', {
        id: savedZone._id,
        data: savedZone,
        createdBy: req.user?.username
      });
    }

    res.status(201).json({
      success: true,
      data: savedZone,
      message: 'Zone created successfully'
    });

  } catch (err) {
    console.error('❌ create zone error:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(400).json({
      success: false,
      error: err.message || 'Failed to create zone'
    });
  }
};

// PATCH /api/zone/:id
exports.update = async (req, res) => {
  const io = req.app.get('io');

  try {
    console.log('📍 Zone update request:', req.params.id, 'from user:', req.user?.username);

    const updates = (({ name, center, radius, isActive }) => ({ name, center, radius, isActive }))(req.body);

    // Add update metadata
    updates.updatedBy = req.user?.id;
    updates.updatedAt = new Date();

    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบพื้นที่',
        id: req.params.id
      });
    }

    console.log('✅ Zone updated:', zone.name);

    // Real-time notification
    if (io) {
      io.emit('zoneUpdated', {
        id: zone._id,
        data: zone,
        updatedBy: req.user?.username
      });
    }

    res.json({
      success: true,
      data: zone,
      message: 'Zone updated successfully'
    });

  } catch (err) {
    console.error('❌ update zone error:', err);

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid zone ID format'
      });
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update zone'
    });
  }
};

// DELETE /api/zone/:id
exports.remove = async (req, res) => {
  const io = req.app.get('io');

  try {
    console.log('📍 Zone delete request:', req.params.id, 'from user:', req.user?.username);

    // Soft delete by setting isActive to false instead of actual deletion
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        deletedBy: req.user?.id,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบพื้นที่',
        id: req.params.id
      });
    }

    console.log('✅ Zone soft deleted:', zone.name);

    // Real-time notification
    if (io) {
      io.emit('zoneDeleted', {
        id: zone._id,
        data: zone,
        deletedBy: req.user?.username
      });
    }

    res.json({
      success: true,
      data: zone,
      message: 'Zone deactivated successfully'
    });

  } catch (err) {
    console.error('❌ delete zone error:', err);

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid zone ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'ไม่สามารถลบพื้นที่ได้',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};