// middlewares/validators/customerValidator.js

const Joi = require('joi');

const individualSchema = Joi.object({
  prefix: Joi.string().valid('นาย', 'นาง', 'นางสาว', 'อื่นๆ').allow(''),
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  phone: Joi.string().pattern(/^[0-9]{9,10}$/).required(),
  email: Joi.string().email().allow(''),
  birthDate: Joi.date().iso().max('now').min('1900-01-01').allow(null),
  age: Joi.number().integer().min(0).max(150).allow(null),
  address: Joi.object({
    houseNo: Joi.string().allow(''),
    moo: Joi.string().allow(''),
    subDistrict: Joi.string().allow(''),
    district: Joi.string().allow(''),
    province: Joi.string().allow(''),
    zipcode: Joi.string().pattern(/^[0-9]{5}$/).allow('')
  }),
  taxId: Joi.string().pattern(/^[0-9]{13}$/).allow('')
});

const corporateSchema = Joi.object({
  companyName: Joi.string().trim().required(),
  companyTaxId: Joi.string().pattern(/^[0-9]{13}$/).required(),
  contactPerson: Joi.string().trim().allow(''),
  corporatePhone: Joi.string().pattern(/^[0-9]{9,10}$/).required(),
  corporateEmail: Joi.string().email().allow(''),
  companyAddress: Joi.string().trim().allow('')
});

const customerSchema = Joi.object({
  customerType: Joi.string().valid('individual', 'corporate').required(),
  individual: Joi.when('customerType', {
    is: 'individual',
    then: individualSchema,
    otherwise: Joi.object()
  }),
  corporate: Joi.when('customerType', {
    is: 'corporate',
    then: corporateSchema,
    otherwise: Joi.object()
  }),
  status: Joi.string().valid('active', 'inactive', 'blacklisted'),
  loyaltyPoints: Joi.number().min(0),
  creditScore: Joi.number().min(0).max(1000),
  installmentInfo: Joi.object({
    creditLimit: Joi.number().min(0)
  }),
  tags: Joi.array().items(Joi.string())
});

exports.validateCustomer = (req, res, next) => {
  const { error } = customerSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors
    });
  }

  next();
};

// Validate for customer lookup
exports.validateLookup = (req, res, next) => {
  const schema = Joi.object({
    taxId: Joi.string().pattern(/^[0-9]{13}$/),
    phone: Joi.string().pattern(/^[0-9-]{9,12}$/),
    customerType: Joi.string().valid('individual', 'corporate')
  }).or('taxId', 'phone');

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุเลขประจำตัวผู้เสียภาษี หรือเบอร์โทรศัพท์'
    });
  }

  next();
};
