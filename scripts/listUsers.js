const mongoose = require('mongoose');
const User = require('../models/User/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/accounting';

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users without populate to avoid schema issues
    const users = await User.find()
      .select('username createdAt')
      .limit(10);

    console.log('\n📋 Available Users:');
    console.log('═'.repeat(60));

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username}`);
      console.log(`   Created: ${user.createdAt?.toLocaleDateString() || 'N/A'}`);
      console.log('─'.repeat(40));
    });

    console.log('\n💡 Try using one of these existing usernames for login testing');
    console.log('   (You may need to know the passwords, or create new ones)');

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

listUsers().catch(console.error);