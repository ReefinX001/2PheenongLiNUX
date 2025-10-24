const Contact = require('../models/contactsModel');

// POST /api/contacts
exports.createContact = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { name, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const newContact = new Contact({ name, email });
    await newContact.save();

    io.emit('newcontactCreated', {
      id: newContact.save()._id,
      data: newContact.save()
    });



    res.json({ success: true, data: newContact });
  } catch (err) {
    console.error('createContact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/contacts
exports.getAllContacts = async (req, res) => {
  const io = req.app.get('io');
  try {
    const contacts = await Contact.find().limit(100).lean().sort({ createdAt: -1 });
    res.json({ success: true, data: contacts });
  } catch (err) {
    console.error('getAllContacts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
