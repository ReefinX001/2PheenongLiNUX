const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch').default;

// Import routes
// const apiRoutes = require('./routes/api');
// const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Use routes
// app.use('/api', apiRoutes);
// app.use('/admin-api', adminRoutes);

// Product data (same as in frontend)
const productData = {
    'iphone-15-pro-max': {
        id: 'iphone-15-pro-max',
        name: 'iPhone 15 Pro Max',
        basePrice: 44900,
        description: 'ไทเทเนียม กล้องโปร เอไอที่เร็วขึ้น',
        features: ['A17 Pro chip', '48MP Pro camera', 'Titanium design', '6.7" display'],
        storage: [
            { capacity: '128GB', price: 44900 },
            { capacity: '256GB', price: 49900 },
            { capacity: '512GB', price: 59900 },
            { capacity: '1TB', price: 69900 }
        ],
        colors: [
            { name: 'Natural Titanium', class: 'titanium', hex: '#8B7355' },
            { name: 'Blue Titanium', class: 'blue', hex: '#4FC3F7' },
            { name: 'White Titanium', class: 'silver', hex: '#F0F0F0' },
            { name: 'Black Titanium', class: 'space-gray', hex: '#4A4A4A' }
        ]
    },
    'iphone-15-pro': {
        id: 'iphone-15-pro',
        name: 'iPhone 15 Pro',
        basePrice: 36900,
        description: 'ไทเทเนียม กล้องโปร เอไอที่เร็วขึ้น',
        features: ['A17 Pro chip', '48MP Pro camera', 'Titanium design', '6.1" display'],
        storage: [
            { capacity: '128GB', price: 36900 },
            { capacity: '256GB', price: 41900 },
            { capacity: '512GB', price: 51900 },
            { capacity: '1TB', price: 61900 }
        ],
        colors: [
            { name: 'Natural Titanium', class: 'titanium', hex: '#8B7355' },
            { name: 'Blue Titanium', class: 'blue', hex: '#4FC3F7' },
            { name: 'White Titanium', class: 'silver', hex: '#F0F0F0' },
            { name: 'Black Titanium', class: 'space-gray', hex: '#4A4A4A' }
        ]
    },
    'iphone-15': {
        id: 'iphone-15',
        name: 'iPhone 15',
        basePrice: 29900,
        description: 'Dynamic Island USB-C กล้องหลัก 48MP',
        features: ['A16 Bionic chip', '48MP Main camera', 'USB-C', '6.1" display'],
        storage: [
            { capacity: '128GB', price: 29900 },
            { capacity: '256GB', price: 34900 },
            { capacity: '512GB', price: 44900 }
        ],
        colors: [
            { name: 'Pink', class: 'pink', hex: '#FF6B9D' },
            { name: 'Yellow', class: 'gold', hex: '#FFD700' },
            { name: 'Green', class: 'green', hex: '#4CAF50' },
            { name: 'Blue', class: 'blue', hex: '#4FC3F7' },
            { name: 'Black', class: 'space-gray', hex: '#4A4A4A' }
        ]
    },
    'iphone-14': {
        id: 'iphone-14',
        name: 'iPhone 14',
        basePrice: 24900,
        description: 'A15 Bionic กล้องหลัก 12MP ถ่ายภาพได้ดี',
        features: ['A15 Bionic chip', '12MP camera system', 'All-day battery', '6.1" display'],
        storage: [
            { capacity: '128GB', price: 24900 },
            { capacity: '256GB', price: 29900 },
            { capacity: '512GB', price: 39900 }
        ],
        colors: [
            { name: 'Blue', class: 'blue', hex: '#4FC3F7' },
            { name: 'Purple', class: 'purple', hex: '#9C27B0' },
            { name: 'Midnight', class: 'space-gray', hex: '#4A4A4A' },
            { name: 'Starlight', class: 'silver', hex: '#F0F0F0' },
            { name: 'Red', class: 'red', hex: '#F44336' }
        ]
    }
};

// API Routes

// Proxy for Google Apps Script (to avoid CORS)
app.get('/api/reviews', async (req, res) => {
    try {
        const REVIEW_API = 'https://script.google.com/macros/s/AKfycbx4G_7lRmZkNkJZYVmcUNJy6kUJNTUTHpQlW3_qXm0_0KHa4bfj8BGOznTGlD4CzRA/exec';
        const response = await fetch(REVIEW_API + '?t=' + Date.now());

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📋 Fetched reviews from Google Apps Script:', data.length, 'items');

        // แปลง URL และเพิ่ม proxy path
        const processedReviews = data.map((item, i) => ({
            url: `/api/image-proxy?url=${encodeURIComponent(item.url)}`,
            name: '',
            text: item.text || ''
        }));

        res.json(processedReviews);
    } catch (error) {
        console.error('❌ Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Image proxy to avoid CORS issues - DISABLED (using main server proxy instead)
// app.get('/api/image-proxy', async (req, res) => {
//     try {
//         const imageUrl = req.query.url;
//         if (!imageUrl) {
//             return res.status(400).json({ error: 'URL parameter is required' });
//         }
//
//         console.log('🖼️ Proxying image:', imageUrl);
//
//         // Convert Google Drive URL to direct download
//         let proxyUrl = imageUrl;
//         if (imageUrl.includes('drive.google.com/uc')) {
//             const match = imageUrl.match(/id=([^&]+)/);
//             if (match) {
//                 const id = match[1];
//                 proxyUrl = `https://drive.google.com/uc?export=download&id=${id}`;
//             }
//         }
//
//         const response = await fetch(proxyUrl);
//
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//
//         // Set appropriate headers
//         res.set({
//             'Content-Type': response.headers.get('content-type') || 'image/jpeg',
//             'Cache-Control': 'public, max-age=3600',
//             'Access-Control-Allow-Origin': '*'
//         });
//
//         // Pipe the image data
//         response.body.pipe(res);
//
//     } catch (error) {
//         console.error('❌ Error proxying image:', error);
//
//         // Return a placeholder image on error
//         res.redirect('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600');
//     }
// });

// Get all products
app.get('/api/products', (req, res) => {
    res.json(productData);
});

// Get specific product
app.get('/api/products/:id', (req, res) => {
    const product = productData[req.params.id];
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

// Calculate installment
app.post('/api/calculate-installment', (req, res) => {
    const { price, months, interestRate = 0 } = req.body;

    if (!price || !months) {
        return res.status(400).json({ error: 'Price and months are required' });
    }

    let installment;
    if (interestRate === 0) {
        installment = Math.ceil(price / months);
    } else {
        const monthlyRate = interestRate / 12 / 100;
        installment = price * monthlyRate * Math.pow(1 + monthlyRate, months) /
                     (Math.pow(1 + monthlyRate, months) - 1);
        installment = Math.ceil(installment);
    }

    res.json({
        originalPrice: price,
        months: months,
        interestRate: interestRate,
        monthlyInstallment: installment,
        totalAmount: installment * months
    });
});

// Add to cart (placeholder)
app.post('/api/cart/add', (req, res) => {
    const { productId, storage, color, quantity = 1 } = req.body;

    const product = productData[productId];
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const storageOption = product.storage.find(s => s.capacity === storage);
    if (!storageOption) {
        return res.status(400).json({ error: 'Invalid storage option' });
    }

    const colorOption = product.colors.find(c => c.name === color);
    if (!colorOption) {
        return res.status(400).json({ error: 'Invalid color option' });
    }

    const cartItem = {
        id: Date.now().toString(),
        product: product,
        storage: storageOption,
        color: colorOption,
        quantity: quantity,
        totalPrice: storageOption.price * quantity
    };

    // In a real app, this would be saved to a database
    console.log('Cart item added:', cartItem);

    res.json({
        success: true,
        item: cartItem,
        message: 'เพิ่มสินค้าลงตะกร้าเรียบร้อยแล้ว'
    });
});

// Contact form submission (placeholder)
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // In a real app, this would send an email or save to database
    console.log('Contact form submission:', { name, email, message });

    res.json({
        success: true,
        message: 'ข้อความของคุณถูกส่งเรียบร้อยแล้ว เราจะติดต่อกลับในเร็วๆ นี้'
    });
});

// Newsletter subscription (placeholder)
app.post('/api/newsletter', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // In a real app, this would add to mailing list
    console.log('Newsletter subscription:', email);

    res.json({
        success: true,
        message: 'ขอบคุณสำหรับการสมัครรับข่าวสาร!'
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📱 iPhone Pricing App is ready!`);
});
