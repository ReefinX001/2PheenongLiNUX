const Job = require('../../models/FrontStore/Job');

const jobController = {
  // Get all jobs
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, isActive, branch } = req.query;

      const query = {};
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { branch: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      if (branch) {
        query.branch = branch;
      }

      const skip = (page - 1) * limit;
      const total = await Job.countDocuments(query);
      const jobs = await Job.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: jobs,
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่งงาน',
        error: error.message
      });
    }
  },

  // Get active jobs (for public use)
  getActive: async (req, res) => {
    try {
      const jobs = await Job.find({ isActive: true })
        .sort({ order: 1, createdAt: -1 });

      res.json({
        success: true,
        data: jobs
      });
    } catch (error) {
      console.error('Error fetching active jobs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่งงาน',
        error: error.message
      });
    }
  },

  // Get job by ID
  getById: async (req, res) => {
    try {
      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลตำแหน่งงาน'
        });
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่งงาน',
        error: error.message
      });
    }
  },

  // Create new job
  create: async (req, res) => {
    try {
      const jobData = req.body;

      // Convert string booleans to actual booleans if needed
      if (jobData.isActive !== undefined && typeof jobData.isActive === 'string') {
        jobData.isActive = jobData.isActive === 'true';
      }

      const job = new Job(jobData);
      const savedJob = await job.save();

      res.status(201).json({
        success: true,
        message: 'สร้างตำแหน่งงานสำเร็จ',
        data: savedJob
      });
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(400).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างตำแหน่งงาน',
        error: error.message
      });
    }
  },

  // Update job
  update: async (req, res) => {
    try {
      const jobData = req.body;

      // Convert string booleans to actual booleans if needed
      if (jobData.isActive !== undefined && typeof jobData.isActive === 'string') {
        jobData.isActive = jobData.isActive === 'true';
      }

      const job = await Job.findByIdAndUpdate(
        req.params.id,
        jobData,
        { new: true, runValidators: true }
      );

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลตำแหน่งงาน'
        });
      }

      res.json({
        success: true,
        message: 'อัปเดตตำแหน่งงานสำเร็จ',
        data: job
      });
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(400).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตตำแหน่งงาน',
        error: error.message
      });
    }
  },

  // Delete job
  delete: async (req, res) => {
    try {
      const job = await Job.findByIdAndDelete(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลตำแหน่งงาน'
        });
      }

      res.json({
        success: true,
        message: 'ลบตำแหน่งงานสำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบตำแหน่งงาน',
        error: error.message
      });
    }
  },

  // Reorder jobs
  reorder: async (req, res) => {
    try {
      const { orders } = req.body; // Array of { id, order }

      if (!Array.isArray(orders)) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบข้อมูลไม่ถูกต้อง'
        });
      }

      // Update order for each job
      const updatePromises = orders.map(({ id, order }) =>
        Job.findByIdAndUpdate(id, { order }, { new: true })
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'จัดเรียงลำดับตำแหน่งงานสำเร็จ'
      });
    } catch (error) {
      console.error('Error reordering jobs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการจัดเรียงลำดับ',
        error: error.message
      });
    }
  }
};

module.exports = jobController;
