// controllers/accountingController.js
const path = require('path');

exports.getAccountingDashboard = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/accounting_dashboard.html'));
};
