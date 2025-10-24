const mongoose = require('mongoose');

const TambonSchema = new mongoose.Schema({
  tambon_id: Number,
  name_th: String,
  zip_code: Number
}, { _id: false });

const AmphureSchema = new mongoose.Schema({
  amphure_id: Number,
  name_th: String,
  tambons: [TambonSchema]
}, { _id: false });

const ProvinceSchema = new mongoose.Schema({
  province_id: { type: Number, unique: true },
  name_th: String,
  amphures: [AmphureSchema]
});

module.exports = mongoose.models.Province || mongoose.model('Province', ProvinceSchema);