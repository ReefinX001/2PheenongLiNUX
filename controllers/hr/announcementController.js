const Announcement = require('../../models/HR/announcementModel');
const mongoose = require('mongoose');

class AnnouncementController {

  // ดึงประกาศทั้งหมด (สำหรับหน้า announcements.html)
  static async getAllAnnouncements(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        department = 'all',
        type,
        priority,
        search,
        status = 'published'
      } = req.query;

      // สร้าง query object
      const query = { status };

      // Filter by department
      if (department !== 'all') {
        query.$or = [
          { department: 'all' },
          { department: department }
        ];
      }

      // Filter by type
      if (type && type !== 'all') {
        query.type = type;
      }

      // Filter by priority
      if (priority && priority !== 'all') {
        query.priority = priority;
      }

      // Search in title and content
      if (search) {
        query.$text = { $search: search };
      }

      // Filter out expired announcements
      query.$or = query.$or || [];
      query.$or.push(
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      );

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { isSticky: -1, publishDate: -1 },
        populate: {
          path: 'author.id',
          select: 'name email department'
        }
      };

      const announcements = await Announcement.paginate(query, options);

      res.json({
        success: true,
        data: announcements.docs,
        pagination: {
          currentPage: announcements.page,
          totalPages: announcements.totalPages,
          totalDocs: announcements.totalDocs,
          limit: announcements.limit,
          hasNextPage: announcements.hasNextPage,
          hasPrevPage: announcements.hasPrevPage
        }
      });

    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประกาศ'
      });
    }
  }

  // ดึงประกาศล่าสุดสำหรับ Dashboard
  static async getLatestAnnouncements(req, res) {
    try {
      const { limit = 5, department = 'all' } = req.query;

      const announcements = await Announcement.getLatest(parseInt(limit), department);

      res.json({
        success: true,
        data: announcements
      });

    } catch (error) {
      console.error('Error fetching latest announcements:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประกาศล่าสุด'
      });
    }
  }

  // ดึงประกาศตาม ID
  static async getAnnouncementById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'รหัสประกาศไม่ถูกต้อง'
        });
      }

      const announcement = await Announcement.findById(id)
        .populate('author.id', 'name email department');

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบประกาศที่ระบุ'
        });
      }

      // เพิ่มจำนวนการดู
      announcement.views += 1;
      await announcement.save();

      res.json({
        success: true,
        data: announcement
      });

    } catch (error) {
      console.error('Error fetching announcement:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประกาศ'
      });
    }
  }

  // สร้างประกาศใหม่
  static async createAnnouncement(req, res) {
    try {
      const {
        title,
        content,
        type = 'general',
        priority = 'normal',
        department = 'all',
        expiryDate,
        isSticky = false,
        tags = []
      } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'กรุณากรอกหัวข้อและเนื้อหาประกาศ'
        });
      }

      // สร้างข้อมูลผู้เขียน (จาก token หรือ default)
      const author = {
        id: req.user?.id || new mongoose.Types.ObjectId(),
        name: req.user?.name || 'ผู้ดูแลระบบ',
        department: req.user?.department || 'IT'
      };

      const announcementData = {
        title,
        content,
        type,
        priority,
        author,
        department,
        isSticky,
        tags: Array.isArray(tags) ? tags : []
      };

      // ตั้งวันหมดอายุถ้ามี
      if (expiryDate) {
        announcementData.expiryDate = new Date(expiryDate);
      }

      const announcement = new Announcement(announcementData);
      await announcement.save();

      // Populate author data
      await announcement.populate('author.id', 'name email department');

      res.status(201).json({
        success: true,
        data: announcement,
        message: 'สร้างประกาศเรียบร้อยแล้ว'
      });

    } catch (error) {
      console.error('Error creating announcement:', error);

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: messages.join(', ')
        });
      }

      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างประกาศ'
      });
    }
  }

  // แก้ไขประกาศ
  static async updateAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'รหัสประกาศไม่ถูกต้อง'
        });
      }

      // ลบฟิลด์ที่ไม่ควรแก้ไข
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.views;
      delete updateData.readBy;

      const announcement = await Announcement.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('author.id', 'name email department');

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบประกาศที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: announcement,
        message: 'แก้ไขประกาศเรียบร้อยแล้ว'
      });

    } catch (error) {
      console.error('Error updating announcement:', error);

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: messages.join(', ')
        });
      }

      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการแก้ไขประกาศ'
      });
    }
  }

  // ลบประกาศ
  static async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'รหัสประกาศไม่ถูกต้อง'
        });
      }

      const announcement = await Announcement.findByIdAndDelete(id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบประกาศที่ระบุ'
        });
      }

      res.json({
        success: true,
        message: 'ลบประกาศเรียบร้อยแล้ว'
      });

    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการลบประกาศ'
      });
    }
  }

  // อ่านประกาศ (เพิ่มผู้ใช้เข้าไปใน readBy)
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || new mongoose.Types.ObjectId();

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'รหัสประกาศไม่ถูกต้อง'
        });
      }

      const announcement = await Announcement.findById(id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบประกาศที่ระบุ'
        });
      }

      // ตรวจสอบว่าผู้ใช้อ่านแล้วหรือไม่
      if (!announcement.isReadBy(userId)) {
        announcement.readBy.push({
          userId: userId,
          readAt: new Date()
        });
        await announcement.save();
      }

      res.json({
        success: true,
        message: 'บันทึกการอ่านประกาศแล้ว'
      });

    } catch (error) {
      console.error('Error marking announcement as read:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการบันทึกการอ่าน'
      });
    }
  }

  // ดึงสถิติประกาศ
  static async getStatistics(req, res) {
    try {
      const totalAnnouncements = await Announcement.countDocuments();
      const publishedAnnouncements = await Announcement.countDocuments({ status: 'published' });
      const draftAnnouncements = await Announcement.countDocuments({ status: 'draft' });
      const expiredAnnouncements = await Announcement.countDocuments({
        expiryDate: { $lt: new Date() }
      });

      // นับตามประเภท
      const typeStats = await Announcement.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      // นับตามแผนก
      const departmentStats = await Announcement.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]);

      res.json({
        success: true,
        data: {
          total: totalAnnouncements,
          published: publishedAnnouncements,
          draft: draftAnnouncements,
          expired: expiredAnnouncements,
          byType: typeStats,
          byDepartment: departmentStats
        }
      });

    } catch (error) {
      console.error('Error fetching announcement statistics:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงสถิติประกาศ'
      });
    }
  }
}

module.exports = AnnouncementController;
