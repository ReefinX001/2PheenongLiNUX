// controllers/hr/performanceReviewController.js
const PerformanceReview = require('../../models/HR/PerformanceReview');
const User = require('../../models/User/User');
const mongoose = require('mongoose');

/**
 * Get all performance reviews with filters
 * GET /api/performance_reviews
 */
const getAllReviews = async (req, res) => {
  try {
    const { cycle, status, employee, page = 1, limit = 50, sort = '-date' } = req.query;

    // Build filter object
    const filter = { isActive: true };
    if (cycle && cycle !== 'all') filter.cycle = cycle;
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch reviews with population
    const reviews = await PerformanceReview.find(filter)
      .populate({
        path: 'employee',
        populate: {
          path: 'employee',
          select: 'name position department email phone imageUrl'
        }
      })
      .populate('reviewedBy', 'username')
      .populate('approvedBy', 'username')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await PerformanceReview.countDocuments(filter);

    // Transform data for frontend compatibility
    const transformedReviews = reviews.map(review => ({
      _id: review._id,
      employee: {
        _id: review.employee?._id,
        name: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
        position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง'
      },
      employeeName: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
      position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง',
      cycle: review.cycle,
      date: review.date,
      status: review.status,
      score: review.score,
      comments: review.comments,
      evaluations: review.evaluations,
      reviewedBy: review.reviewedBy?.username,
      approvedBy: review.approvedBy?.username,
      approvedAt: review.approvedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }));

    res.json({
      success: true,
      data: transformedReviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลการประเมินผลงานได้'
    });
  }
};

/**
 * Get single performance review by ID
 * GET /api/performance_reviews/:id
 */
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    const review = await PerformanceReview.findById(id)
      .populate({
        path: 'employee',
        populate: {
          path: 'employee',
          select: 'name position department email phone imageUrl'
        }
      })
      .populate('reviewedBy', 'username')
      .populate('approvedBy', 'username');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการประเมินผลงาน'
      });
    }

    // Transform data for frontend
    const transformedReview = {
      _id: review._id,
      employee: {
        _id: review.employee?._id,
        name: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
        position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง'
      },
      employeeName: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
      position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง',
      cycle: review.cycle,
      date: review.date,
      status: review.status,
      score: review.score,
      comments: review.comments,
      evaluations: review.evaluations,
      reviewedBy: review.reviewedBy?.username,
      approvedBy: review.approvedBy?.username,
      approvedAt: review.approvedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };

    res.json({
      success: true,
      data: transformedReview
    });
  } catch (error) {
    console.error('Error fetching performance review:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลการประเมินผลงานได้'
    });
  }
};

/**
 * Create new performance review
 * POST /api/performance_reviews
 */
const createReview = async (req, res) => {
  try {
    const { employee, cycle, date, status, score, comments, evaluations } = req.body;

    // Validate required fields
    if (!employee || !cycle || !date) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุข้อมูลพนักงาน รอบการประเมิน และวันที่'
      });
    }

    // Validate employee exists
    const employeeUser = await User.findById(employee);
    if (!employeeUser) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงาน'
      });
    }

    // Check if review already exists for this employee and cycle
    const existingReview = await PerformanceReview.findOne({
      employee,
      cycle,
      isActive: true
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: 'มีการประเมินผลงานสำหรับพนักงานและรอบนี้แล้ว'
      });
    }

    // Create new review
    const reviewData = {
      employee,
      cycle,
      date: new Date(date),
      status: status || 'รอพิจารณา',
      comments: comments || '',
      evaluations: evaluations || {},
      reviewedBy: req.user._id
    };

    // If score is provided manually, use it; otherwise it will be calculated in pre-save hook
    if (score !== undefined) {
      reviewData.score = parseFloat(score);
    }

    const review = new PerformanceReview(reviewData);
    await review.save();

    // Populate the saved review for response
    await review.populate({
      path: 'employee',
      populate: {
        path: 'employee',
        select: 'name position department email phone imageUrl'
      }
    });

    // Transform data for frontend
    const transformedReview = {
      _id: review._id,
      employee: {
        _id: review.employee?._id,
        name: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
        position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง'
      },
      employeeName: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
      position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง',
      cycle: review.cycle,
      date: review.date,
      status: review.status,
      score: review.score,
      comments: review.comments,
      evaluations: review.evaluations,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };

    res.status(201).json({
      success: true,
      data: transformedReview,
      message: 'สร้างการประเมินผลงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating performance review:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'มีการประเมินผลงานสำหรับพนักงานและรอบนี้แล้ว'
      });
    }

    res.status(500).json({
      success: false,
      error: 'ไม่สามารถสร้างการประเมินผลงานได้'
    });
  }
};

/**
 * Update performance review
 * PATCH /api/performance_reviews/:id
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    // Find existing review
    const review = await PerformanceReview.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการประเมินผลงาน'
      });
    }

    // Validate employee if being updated
    if (updateData.employee && updateData.employee !== review.employee.toString()) {
      const employeeUser = await User.findById(updateData.employee);
      if (!employeeUser) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบข้อมูลพนักงาน'
        });
      }

      // Check for duplicate if changing employee or cycle
      if (updateData.cycle && updateData.cycle !== review.cycle) {
        const existingReview = await PerformanceReview.findOne({
          employee: updateData.employee,
          cycle: updateData.cycle,
          isActive: true,
          _id: { $ne: id }
        });

        if (existingReview) {
          return res.status(409).json({
            success: false,
            error: 'มีการประเมินผลงานสำหรับพนักงานและรอบนี้แล้ว'
          });
        }
      }
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key === 'date' && updateData[key]) {
        review[key] = new Date(updateData[key]);
      } else if (key === 'score' && updateData[key] !== undefined) {
        review[key] = parseFloat(updateData[key]);
      } else if (updateData[key] !== undefined) {
        review[key] = updateData[key];
      }
    });

    review.reviewedBy = req.user._id;
    await review.save();

    // Populate for response
    await review.populate({
      path: 'employee',
      populate: {
        path: 'employee',
        select: 'name position department email phone imageUrl'
      }
    });

    // Transform data for frontend
    const transformedReview = {
      _id: review._id,
      employee: {
        _id: review.employee?._id,
        name: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
        position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง'
      },
      employeeName: review.employee?.employee?.name || review.employee?.username || 'ไม่พบชื่อ',
      position: review.employee?.employee?.position || 'ไม่ระบุตำแหน่ง',
      cycle: review.cycle,
      date: review.date,
      status: review.status,
      score: review.score,
      comments: review.comments,
      evaluations: review.evaluations,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };

    res.json({
      success: true,
      data: transformedReview,
      message: 'อัปเดตการประเมินผลงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating performance review:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'มีการประเมินผลงานสำหรับพนักงานและรอบนี้แล้ว'
      });
    }

    res.status(500).json({
      success: false,
      error: 'ไม่สามารถอัปเดตการประเมินผลงานได้'
    });
  }
};

/**
 * Delete performance review (soft delete)
 * DELETE /api/performance_reviews/:id
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    const review = await PerformanceReview.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการประเมินผลงาน'
      });
    }

    // Soft delete by setting isActive to false
    review.isActive = false;
    await review.save();

    res.json({
      success: true,
      message: 'ลบการประเมินผลงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting performance review:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถลบการประเมินผลงานได้'
    });
  }
};

/**
 * Get performance review statistics
 * GET /api/performance_reviews/stats
 */
const getReviewStats = async (req, res) => {
  try {
    const { cycle } = req.query;

    const filter = { isActive: true };
    if (cycle && cycle !== 'all') filter.cycle = cycle;

    const stats = await PerformanceReview.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: '$score' },
          passed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ผ่าน'] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'รอพิจารณา'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ไม่ผ่าน'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      avgScore: 0,
      passed: 0,
      pending: 0,
      failed: 0
    };

    res.json({
      success: true,
      data: {
        ...result,
        avgScore: Math.round(result.avgScore * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error fetching performance review stats:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงสถิติการประเมินผลงานได้'
    });
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats
};