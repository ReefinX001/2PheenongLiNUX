// middlewares/validateUser.js
const Joi = require('joi');
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Schema สำหรับลงทะเบียน
const registerSchema = Joi.object({
  employee: Joi.string().pattern(objectIdPattern).required()
    .messages({
      'any.required': 'กรุณาระบุ employee',
      'string.pattern.base': 'employee ต้องเป็น ObjectId ที่ถูกต้อง'
    }),
  username: Joi.string().trim().min(3).required()
    .messages({
      'any.required': 'กรุณาระบุ username',
      'string.min': 'username ต้องมีความยาวขั้นต่ำ 3 ตัวอักษร'
    }),
  password: Joi.string().min(8).required()
    .messages({
      'any.required': 'กรุณาระบุ password',
      'string.min': 'password ต้องมีความยาวขั้นต่ำ 8 ตัวอักษร'
    }),
  role: Joi.string().pattern(objectIdPattern).required()
    .messages({
      'any.required': 'กรุณาระบุ role',
      'string.pattern.base': 'role ต้องเป็น ObjectId ที่ถูกต้อง'
    }),

  // เพิ่ม allowedPages - array ของ string (module ids)
  allowedPages: Joi.array().items(
    Joi.string().trim().required()
      .messages({ 'string.empty': 'allowedPages ต้องเป็นอาเรย์ของ string' })
  ).default([]),

  // allowedBranches เป็นอาเรย์ของ string (ObjectId หรือ '*')
  allowedBranches: Joi.array().items(
    Joi.string().trim().required()
      .messages({ 'string.empty': 'allowedBranches ต้องเป็นอาเรย์ของ string' })
  ).default([]),

  // เพิ่ม checkinBranches - array ของ string (branch ids)
  checkinBranches: Joi.array().items(
    Joi.string().trim().required()
      .messages({ 'string.empty': 'checkinBranches ต้องเป็นอาเรย์ของ string' })
  ).default([]),

  // defaultBranches เป็นอาเรย์ของ ObjectId หรือ string
  defaultBranches: Joi.array().items(
    Joi.string().trim().required()
      .messages({ 'string.empty': 'defaultBranches ต้องเป็นอาเรย์ของ string' })
  ).default([]),

  // เพิ่ม defaultBranch - string (single branch id)
  defaultBranch: Joi.string().trim().allow(null).optional()
    .messages({ 'string.empty': 'defaultBranch ต้องเป็น string หรือ null' })
});

// Schema สำหรับล็อกอิน
const loginSchema = Joi.object({
  username: Joi.string().trim().required()
    .messages({ 'any.required': 'กรุณาระบุ username' }),
  password: Joi.string().required()
    .messages({ 'any.required': 'กรุณาระบุ password' })
});

// Schema สำหรับอัปเดตผู้ใช้
const updateSchema = Joi.object({
  username: Joi.string().trim().min(3)
    .messages({ 'string.min': 'username ต้องมีความยาวขั้นต่ำ 3 ตัวอักษร' }),
  password: Joi.string().min(8)
    .messages({ 'string.min': 'password ต้องมีความยาวขั้นต่ำ 8 ตัวอักษร' }),
  role: Joi.string().pattern(objectIdPattern)
    .messages({ 'string.pattern.base': 'role ต้องเป็น ObjectId ที่ถูกต้อง' }),
  allowedPages: Joi.array().items(
    Joi.string().trim().min(1)
  ).default([]).optional(),
  allowedBranches: Joi.array().items(
    Joi.string().trim().min(1)
  ).optional(),
  checkinBranches: Joi.array().items(
    Joi.string().trim().min(1)
  ).optional(),
  defaultBranches: Joi.array().items(
    Joi.string().trim().min(1)
  ).optional(),
  isBlocked: Joi.boolean()
    .messages({ 'boolean.base': 'isBlocked ต้องเป็น true หรือ false' })
})
.or('username', 'password', 'role', 'allowedPages', 'allowedBranches', 'checkinBranches', 'defaultBranches', 'isBlocked')
.messages({
  'object.missing': 'กรุณาระบุอย่างน้อยหนึ่งฟิลด์ที่ต้องการอัปเดต (username, password, role, allowedPages, allowedBranches, checkinBranches, defaultBranches, isBlocked)'
});

// Middleware สำหรับ validate register
exports.validateRegister = (req, res, next) => {
  const { error, value } = registerSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ success: false, errors: error.details.map(d => d.message) });
  }
  req.validatedBody = value;
  next();
};

// Middleware สำหรับ validate login
exports.validateLogin = (req, res, next) => {
  console.log('🔍 validateLogin middleware - Request Info:', {
    hasBody: !!req.body,
    body: req.body,
    bodyType: typeof req.body,
    contentType: req.get('Content-Type'),
    bodyString: JSON.stringify(req.body),
    bodyStringLength: req.body ? JSON.stringify(req.body).length : 0
  });

  try {
    const { error, value } = loginSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      console.log('🔍 Joi Validation Error:', error.details);
      return res.status(400).json({ success: false, errors: error.details.map(d => d.message) });
    }
    req.validatedBody = value;
    console.log('🔍 Validation Success - validatedBody:', value);
    next();
  } catch (validationError) {
    console.error('🔍 Validation Exception:', validationError);
    return res.status(500).json({ success: false, error: 'Validation processing error' });
  }
};

// Middleware สำหรับ validate update
exports.validateUpdate = (req, res, next) => {
  const { error, value } = updateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ success: false, errors: error.details.map(d => d.message) });
  }
  req.validatedBody = value;
  next();
};
