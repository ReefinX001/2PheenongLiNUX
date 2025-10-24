const express = require('express');
const router = express.Router();
const Province = require('../models/Province');

// GET /api/provinces - ดึงรายชื่อจังหวัดทั้งหมด
router.get('/', async (req, res) => {
  try {
    const provinces = await Province.find({}, 'province_id name_th').sort('province_id');
    res.json(provinces);
  } catch (error) {
    console.error('Error fetching provinces:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลจังหวัดได้' });
  }
});

// GET /api/provinces/:province_id/amphures - ดึงรายชื่ออำเภอของจังหวัด
router.get('/:province_id/amphures', async (req, res) => {
  try {
    const { province_id } = req.params;
    const province = await Province.findOne({ province_id: parseInt(province_id) });

    if (!province) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลจังหวัด' });
    }

    const amphures = province.amphures.map(amphure => ({
      amphure_id: amphure.amphure_id,
      name_th: amphure.name_th
    }));

    res.json(amphures);
  } catch (error) {
    console.error('Error fetching amphures:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลอำเภอได้' });
  }
});

// GET /api/provinces/:province_id/amphures/:amphure_id/tambons - ดึงรายชื่อตำบลของอำเภอ
router.get('/:province_id/amphures/:amphure_id/tambons', async (req, res) => {
  try {
    const { province_id, amphure_id } = req.params;
    const province = await Province.findOne({ province_id: parseInt(province_id) });

    if (!province) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลจังหวัด' });
    }

    const amphure = province.amphures.find(a => a.amphure_id === parseInt(amphure_id));

    if (!amphure) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลอำเภอ' });
    }

    const tambons = amphure.tambons.map(tambon => ({
      tambon_id: tambon.tambon_id,
      name_th: tambon.name_th,
      zip_code: tambon.zip_code
    }));

    res.json(tambons);
  } catch (error) {
    console.error('Error fetching tambons:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลตำบลได้' });
  }
});

// GET /api/provinces/search - ค้นหาข้อมูล (จังหวัด, อำเภอ, ตำบล)
router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || q.length < 1) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q, 'i');
    const results = [];

    if (type === 'province' || !type) {
      const provinces = await Province.find({ name_th: searchRegex }, 'province_id name_th').limit(10);
      results.push(...provinces.map(p => ({
        type: 'province',
        id: p.province_id,
        name_th: p.name_th
      })));
    }

    if (type === 'amphure' || !type) {
      const provinces = await Province.find(
        { 'amphures.name_th': searchRegex },
        'province_id name_th amphures'
      ).limit(5);

      provinces.forEach(province => {
        province.amphures.forEach(amphure => {
          if (amphure.name_th.match(searchRegex)) {
            results.push({
              type: 'amphure',
              id: amphure.amphure_id,
              name_th: amphure.name_th,
              province_id: province.province_id,
              province_name: province.name_th
            });
          }
        });
      });
    }

    if (type === 'tambon' || !type) {
      const provinces = await Province.find(
        { 'amphures.tambons.name_th': searchRegex },
        'province_id name_th amphures'
      ).limit(5);

      provinces.forEach(province => {
        province.amphures.forEach(amphure => {
          amphure.tambons.forEach(tambon => {
            if (tambon.name_th.match(searchRegex)) {
              results.push({
                type: 'tambon',
                id: tambon.tambon_id,
                name_th: tambon.name_th,
                zip_code: tambon.zip_code,
                amphure_id: amphure.amphure_id,
                amphure_name: amphure.name_th,
                province_id: province.province_id,
                province_name: province.name_th
              });
            }
          });
        });
      });
    }

    res.json(results.slice(0, 20));
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'ไม่สามารถค้นหาได้' });
  }
});

module.exports = router;