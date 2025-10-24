// scripts/listRoles.js
require('dotenv').config();
const mongoose = require('mongoose');
const UserRole = require('../models/UserRole');

async function list() {
  await mongoose.connect(process.env.MONGO_URI);
  const roles = await UserRole.find({}, 'name _id');
  console.log('Available roles:', roles);
  await mongoose.disconnect();
  process.exit(0);
}

list();
