const db = require('../database/db');

module.exports = function(socket) {
  // Handle request for cost data
  socket.on('getCostData', async (filters) => {
    try {
      const { dateFrom, dateTo, category } = filters;

      let query = `
        SELECT p.product_id AS id, p.name, p.category, i.quantity, i.cost AS unitCost, i.date
        FROM inventory_transactions i
        JOIN products p ON i.product_id = p.product_id
        WHERE i.transaction_type = 'purchase'
      `;

      const params = [];

      if (dateFrom) {
        query += ` AND i.date >= ?`;
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ` AND i.date <= ?`;
        params.push(dateTo + ' 23:59:59');
      }

      if (category) {
        query += ` AND p.category = ?`;
        params.push(category);
      }

      query += ` ORDER BY i.date DESC`;

      const costs = await db.query(query, params);

      socket.emit('costData', costs);
    } catch (error) {
      console.error('Error fetching cost data:', error);
      socket.emit('error', { message: 'Failed to fetch cost data' });
    }
  });

  // Handle request for categories
  socket.on('getCategories', async () => {
    try {
      const query = `
        SELECT DISTINCT category 
        FROM products 
        ORDER BY category
      `;

      const categories = await db.query(query);
      const categoryList = categories.map(item => item.category);

      socket.emit('categories', categoryList);
    } catch (error) {
      console.error('Error fetching categories:', error);
      socket.emit('error', { message: 'Failed to fetch categories' });
    }
  });
};
