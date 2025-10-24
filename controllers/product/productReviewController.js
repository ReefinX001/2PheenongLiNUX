// controllers/productReviewController.js

const ProductReview = require('../models/Stock/ProductReview');

/**
 * POST /api/product-review
 * สร้าง Review ใหม่ให้สินค้าตัวหนึ่ง
 */
exports.createReview = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      product_id,
      customer_id,
      rating,
      review,
      status
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    const newReview = new ProductReview({
      product_id,
      customer_id: customer_id || null,
      rating: rating || 0,
      review: review || '',
      status: status || 'pending'
    });

    await newReview.save();

    io.emit('newreviewCreated', {
      id: newReview.save()._id,
      data: newReview.save()
    });



    return res.json({ success: true, data: newReview });
  } catch (err) {
    console.error('createReview error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-review
 * ดึง Review ทั้งหมด
 */
exports.getAllReviews = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate product_id, customer_id ถ้าต้องการ
    const reviews = await ProductReview.find().limit(100).lean()
      .populate('product_id', 'name')
      .populate('customer_id', 'first_name last_name')
      .sort({ _id: -1 });

    return res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('getAllReviews error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-review/product/:productId
 * ดึงรีวิวเฉพาะสินค้าตัวนั้น
 */
exports.getReviewsByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    const reviews = await ProductReview.find({ product_id: productId }).limit(100).lean()
      .populate('customer_id', 'first_name last_name')
      .sort({ _id: -1 });

    return res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('getReviewsByProduct error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-review/:id
 * ดึง Review ตาม _id
 */
exports.getReviewById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const review = await ProductReview.findById(id).lean()
      .populate('product_id', 'name')
      .populate('customer_id', 'first_name last_name');

    if (!review) {
      return res.status(404).json({ error: 'ProductReview not found' });
    }
    return res.json({ success: true, data: review });
  } catch (err) {
    console.error('getReviewById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/product-review/:id
 * อัปเดตบางส่วนของรีวิว
 */
exports.updateReview = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { rating, review, status } = req.body;

    const pr = await ProductReview.findById(id).lean();
    if (!pr) {
      return res.status(404).json({ error: 'ProductReview not found' });
    }

    if (rating !== undefined) pr.rating = rating;
    if (review !== undefined) pr.review = review;
    if (status !== undefined) pr.status = status;

    await pr.save();

    io.emit('prCreated', {
      id: pr.save()._id,
      data: pr.save()
    });



    return res.json({ success: true, data: pr });
  } catch (err) {
    console.error('updateReview error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/product-review/:id
 * ลบออกจาก DB จริง
 */
exports.deleteReview = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const pr = await ProductReview.findById(id).lean();
    if (!pr) {
      return res.status(404).json({ error: 'ProductReview not found' });
    }

    await pr.remove();
    return res.json({ success: true, data: pr });
  } catch (err) {
    console.error('deleteReview error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
