/**
 * Verify credit notes in MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CreditNote = require('./models/POS/CreditNote');

async function verifyCreditNotes() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI;

    if (mongoURI) {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 20000,
        family: 4
      });
      console.log('✅ Connected to MongoDB Atlas\n');
    } else {
      await mongoose.connect('mongodb://127.0.0.1:27017/myAccountingDB', {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        family: 4
      });
      console.log('✅ Connected to local MongoDB\n');
    }

    // Query credit notes
    console.log('📊 CREDIT NOTES IN DATABASE:');
    console.log('='.repeat(60));

    const creditNotes = await CreditNote.find({})
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Total Credit Notes: ${creditNotes.length}\n`);

    if (creditNotes.length > 0) {
      creditNotes.forEach((cn, index) => {
        console.log(`${index + 1}. Credit Note #${cn.creditNoteNumber}`);
        console.log(`   Created: ${new Date(cn.createdAt).toLocaleString('th-TH')}`);
        console.log(`   Customer: ${cn.customerName}`);
        console.log(`   Reason: ${cn.reason} - ${cn.reasonDetail || 'N/A'}`);
        console.log(`   Amount: ฿${cn.totalAmount?.toLocaleString() || 0}`);
        console.log(`   Refund: ฿${cn.refundAmount?.toLocaleString() || 0} (${cn.refundMethod || 'N/A'})`);
        console.log(`   Status: ${cn.status}`);
        console.log(`   Branch: ${cn.branch_code || 'N/A'}`);
        console.log(`   Deposit Receipt: ${cn.depositReceiptNumber}`);

        if (cn.items && cn.items.length > 0) {
          console.log(`   Items:`);
          cn.items.forEach(item => {
            console.log(`     - ${item.productName} x${item.quantity} = ฿${item.amount}`);
          });
        }

        if (cn.notes) {
          console.log(`   Notes: ${cn.notes}`);
        }
        console.log('');
      });
    } else {
      console.log('No credit notes found in the database.');
    }

    // Summary statistics
    console.log('='.repeat(60));
    console.log('📈 SUMMARY STATISTICS:');

    const stats = await CreditNote.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalRefund: { $sum: '$refundAmount' }
        }
      }
    ]);

    if (stats.length > 0) {
      console.log('\nBy Status:');
      stats.forEach(stat => {
        console.log(`  ${stat._id || 'unknown'}: ${stat.count} notes`);
        console.log(`    Total Amount: ฿${stat.totalAmount?.toLocaleString() || 0}`);
        console.log(`    Total Refund: ฿${stat.totalRefund?.toLocaleString() || 0}`);
      });
    }

    // Recent activity
    const recentNotes = await CreditNote.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('creditNoteNumber createdAt totalAmount status');

    console.log('\n📅 Recent Activity (Last 5):');
    recentNotes.forEach(note => {
      const timeAgo = getTimeAgo(note.createdAt);
      console.log(`  • ${note.creditNoteNumber} - ${timeAgo} - ฿${note.totalAmount} - ${note.status}`);
    });

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// Run verification
console.log('='.repeat(60));
console.log('CREDIT NOTE DATABASE VERIFICATION');
console.log('='.repeat(60));
verifyCreditNotes();