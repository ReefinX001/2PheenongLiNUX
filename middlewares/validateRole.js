// middlewares/validateRole.js
const Joi = require('joi');

// ตรวจสอบ payload สำหรับสร้าง/อัปเดต Role
const roleSchema = Joi.object({
  name: Joi.string().trim().required()
    .messages({
      'any.required': 'กรุณาระบุชื่อ role',
      'string.empty': 'ชื่อ role ต้องไม่ว่าง'
    }),
  description: Joi.string().trim().allow('').optional(),
  allowedPages: Joi.array().items(
    Joi.string().trim().required()
      .messages({ 'string.empty': 'allowedPages ต้องเป็น array ของ string' })
  ).optional(),
  allowedBranches: Joi.array().items(
    Joi.string().trim().required()
      .messages({ 'string.empty': 'allowedBranches ต้องเป็น array ของ string' })
  ).optional()
});

// ตรวจสอบ payload สำหรับ PATCH /:id/pages
const allowedPageSchema = Joi.object({
  page: Joi.string().trim().required()
    .messages({
      'any.required': 'กรุณาระบุ page',
      'string.empty': 'page ต้องไม่ว่าง'
    }),
  allow: Joi.boolean().required()
    .messages({ 'any.required': 'กรุณาระบุ allow ให้เป็น true/false' })
});

// ตรวจสอบ payload สำหรับ PATCH /:id/branches
const allowedBranchSchema = Joi.object({
  branch: Joi.string().trim().required()
    .messages({
      'any.required': 'กรุณาระบุ branch',
      'string.empty': 'branch ต้องไม่ว่าง'
    }),
  allow: Joi.boolean().required()
    .messages({ 'any.required': 'กรุณาระบุ allow ให้เป็น true/false' })
});

exports.validateRole = (req, res, next) => {
  const { error, value } = roleSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map(d => d.message)
    });
  }
  req.validatedBody = value;
  next();
};

exports.validateAllowedPage = (req, res, next) => {
  const { error, value } = allowedPageSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map(d => d.message)
    });
  }
  req.validatedBody = value;
  next();
};

exports.validateAllowedBranch = (req, res, next) => {
  const { error, value } = allowedBranchSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map(d => d.message)
    });
  }
  req.validatedBody = value;
  next();
};
