const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/accountingdb')
  .then(async () => {
    const BranchStock = require('./models/POS/BranchStock');

    // Check current stock for SKW3FHL76RC
    const stock = await BranchStock.findOne({
      $or: [
        { barcode: 'SKW3FHL76RC' },
        { _id: '6872232237da42f5e36840cf' }
      ]
    });

    console.log('Current Stock Status:');
    console.log('ID:', stock?._id);
    console.log('Barcode:', stock?.barcode);
    console.log('Name:', stock?.name);
    console.log('Current Quantity:', stock?.quantity);
    console.log('Available Quantity:', stock?.availableQuantity);

    // Restore stock to 1 if it's 0
    if (stock && stock.quantity === 0) {
      stock.quantity = 1;
      stock.availableQuantity = 1;
      await stock.save();
      console.log('\n✅ Stock restored to 1');

      // Also check the updated stock
      const updatedStock = await BranchStock.findById(stock._id);
      console.log('\nUpdated Stock:');
      console.log('Quantity:', updatedStock.quantity);
      console.log('Available Quantity:', updatedStock.availableQuantity);
    } else if (stock && stock.quantity > 0) {
      console.log('\n✅ Stock is already available:', stock.quantity);
    } else {
      console.log('\n❌ Stock not found');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });