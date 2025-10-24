// controllers/chartOfAccountsController.js
const ChartOfAccount = require('../models/Account/ChartOfAccount');

class ChartOfAccountsController {
  // GET /api/chart-of-accounts
  static async getAll(req, res) {
    try {
      const accounts = await ChartOfAccount.find({ deleted_at: null }).limit(100).lean().sort({ account_code: 1 });
      res.json({ success: true, data: accounts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/chart-of-accounts/:id
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const account = await ChartOfAccount.findById(id).lean();
      if (!account || account.deleted_at) {
        return res.status(404).json({ error: 'Account not found or deleted' });
      }
      res.json({ success: true, data: account });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/chart-of-accounts
  static async create(req, res) {
    try {
      const { account_code, account_name, account_type, description, parent_account } = req.body;
      const newAccount = new ChartOfAccount({
        account_code,
        account_name,
        account_type,
        description,
        parent_account
      });
      await newAccount.save();
      res.json({ success: true, data: newAccount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/chart-of-accounts/:id
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const account = await ChartOfAccount.findByIdAndUpdate(id, updates, { new: true });
      if (!account || account.deleted_at) {
        return res.status(404).json({ error: 'Account not found or deleted' });
      }
      res.json({ success: true, data: account });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/chart-of-accounts/:id
  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const account = await ChartOfAccount.findById(id).lean();
      if (!account || account.deleted_at) {
        return res.status(404).json({ error: 'Account not found or already deleted' });
      }
      await account.softDelete();
      res.json({ success: true, data: account });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = ChartOfAccountsController;
