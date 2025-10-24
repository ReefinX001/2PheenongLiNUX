// Product Pricing Script
let currentCategory = 'iphone';
let productData = {};

// Extended product data with all categories
const allProductData = {
    iphone: {
        'iphone-15-pro-max': {
            name: 'iPhone 15 Pro Max',
            basePrice: 44900,
            storage: [
                { capacity: '128GB', price: 44900 },
                { capacity: '256GB', price: 49900 },
                { capacity: '512GB', price: 59900 },
                { capacity: '1TB', price: 69900 }
            ]
        },
        'iphone-15-pro': {
            name: 'iPhone 15 Pro',
            basePrice: 36900,
            storage: [
                { capacity: '128GB', price: 36900 },
                { capacity: '256GB', price: 41900 },
                { capacity: '512GB', price: 51900 },
                { capacity: '1TB', price: 61900 }
            ]
        },
        'iphone-15': {
            name: 'iPhone 15',
            basePrice: 29900,
            storage: [
                { capacity: '128GB', price: 29900 },
                { capacity: '256GB', price: 34900 },
                { capacity: '512GB', price: 44900 }
            ]
        },
        'iphone-14': {
            name: 'iPhone 14',
            basePrice: 24900,
            storage: [
                { capacity: '128GB', price: 24900 },
                { capacity: '256GB', price: 29900 },
                { capacity: '512GB', price: 39900 }
            ]
        },
        'iphone-13': {
            name: 'iPhone 13',
            basePrice: 22900,
            storage: [
                { capacity: '128GB', price: 22900 },
                { capacity: '256GB', price: 27900 },
                { capacity: '512GB', price: 37900 }
            ]
        }
    },
    ipad: {
        'ipad-pro-12': {
            name: 'iPad Pro 12.9"',
            basePrice: 35900,
            storage: [
                { capacity: '128GB', price: 35900 },
                { capacity: '256GB', price: 39900 },
                { capacity: '512GB', price: 47900 },
                { capacity: '1TB', price: 59900 }
            ]
        },
        'ipad-air': {
            name: 'iPad Air',
            basePrice: 21900,
            storage: [
                { capacity: '64GB', price: 21900 },
                { capacity: '256GB', price: 27900 }
            ]
        },
        'ipad': {
            name: 'iPad',
            basePrice: 12900,
            storage: [
                { capacity: '64GB', price: 12900 },
                { capacity: '256GB', price: 17900 }
            ]
        },
        'ipad-mini': {
            name: 'iPad mini',
            basePrice: 17900,
            storage: [
                { capacity: '64GB', price: 17900 },
                { capacity: '256GB', price: 22900 }
            ]
        }
    },
    android: {
        'samsung-s24-ultra': {
            name: 'Samsung Galaxy S24 Ultra',
            basePrice: 42900,
            storage: [
                { capacity: '256GB', price: 42900 },
                { capacity: '512GB', price: 48900 },
                { capacity: '1TB', price: 58900 }
            ]
        },
        'samsung-s24': {
            name: 'Samsung Galaxy S24',
            basePrice: 27900,
            storage: [
                { capacity: '128GB', price: 27900 },
                { capacity: '256GB', price: 32900 }
            ]
        },
        'pixel-8-pro': {
            name: 'Google Pixel 8 Pro',
            basePrice: 32900,
            storage: [
                { capacity: '128GB', price: 32900 },
                { capacity: '256GB', price: 37900 },
                { capacity: '512GB', price: 46900 }
            ]
        },
        'xiaomi-14': {
            name: 'Xiaomi 14',
            basePrice: 24900,
            storage: [
                { capacity: '256GB', price: 24900 },
                { capacity: '512GB', price: 29900 }
            ]
        }
    },
    accessories: {
        'airpods-pro': {
            name: 'AirPods Pro (2nd Gen)',
            basePrice: 8900,
            storage: [
                { capacity: 'Standard', price: 8900 }
            ]
        },
        'airpods-3': {
            name: 'AirPods (3rd Gen)',
            basePrice: 6500,
            storage: [
                { capacity: 'Standard', price: 6500 }
            ]
        },
        'apple-watch-ultra': {
            name: 'Apple Watch Ultra 2',
            basePrice: 27900,
            storage: [
                { capacity: '49mm', price: 27900 }
            ]
        },
        'iphone-case': {
            name: 'iPhone Leather Case',
            basePrice: 1900,
            storage: [
                { capacity: 'Standard', price: 1900 }
            ]
        }
    }
};

// Format currency
function formatCurrency(amount) {
    return `฿${amount.toLocaleString()}`;
}

// Calculate installment
function calculateInstallment(price, months) {
    return Math.ceil(price / months);
}

// Render products
function renderProducts(category) {
    const container = document.getElementById('products-container');
    const products = allProductData[category] || {};

    if (Object.keys(products).length === 0) {
        container.innerHTML = `
            <div class="loading">
                <p>ไม่มีสินค้าในหมวดหมู่นี้</p>
            </div>
        `;
        return;
    }

    let html = '<div class="products-grid">';

    Object.entries(products).forEach(([productId, product]) => {
        html += `
            <div class="product-item" data-product="${productId}">
                <h3 class="product-name">${product.name}</h3>
                
                <div class="storage-options">
                    <div class="storage-label">เลือกขนาดความจำ:</div>
                    <div class="storage-buttons">
                        ${product.storage.map((storage, index) => `
                            <button class="storage-btn ${index === 0 ? 'active' : ''}" 
                                    data-price="${storage.price}"
                                    data-capacity="${storage.capacity}">
                                ${storage.capacity}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pricing-section">
                    <div class="cash-price">
                        <div class="price-label">ราคาเงินสด</div>
                        <div class="price-amount">${formatCurrency(product.storage[0].price)}</div>
                    </div>

                    <div class="installment-options">
                        <div class="installment-option">
                            <div class="installment-months">12 เดือน</div>
                            <div class="installment-amount">${formatCurrency(calculateInstallment(product.storage[0].price, 12))}/เดือน</div>
                        </div>
                        <div class="installment-option">
                            <div class="installment-months">24 เดือน</div>
                            <div class="installment-amount">${formatCurrency(calculateInstallment(product.storage[0].price, 24))}/เดือน</div>
                        </div>
                        <div class="installment-option">
                            <div class="installment-months">36 เดือน</div>
                            <div class="installment-amount">${formatCurrency(calculateInstallment(product.storage[0].price, 36))}/เดือน</div>
                        </div>
                    </div>
                </div>

                <div class="product-actions">
                    <button class="action-btn btn-primary" onclick="contactForPurchase('${product.name}')">
                        💬 สอบถามราคา
                    </button>
                    <button class="action-btn btn-secondary" onclick="addToCompare('${productId}')">
                        ⚖️ เปรียบเทียบ
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for storage buttons
    addStorageButtonListeners();
}

// Add storage button event listeners
function addStorageButtonListeners() {
    document.querySelectorAll('.storage-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productItem = this.closest('.product-item');
            const allBtns = productItem.querySelectorAll('.storage-btn');
            const priceAmount = productItem.querySelector('.price-amount');
            const installmentAmounts = productItem.querySelectorAll('.installment-amount');

            // Update active state
            allBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Update prices
            const newPrice = parseInt(this.dataset.price);
            priceAmount.textContent = formatCurrency(newPrice);

            // Update installment amounts
            installmentAmounts[0].textContent = formatCurrency(calculateInstallment(newPrice, 12)) + '/เดือน';
            installmentAmounts[1].textContent = formatCurrency(calculateInstallment(newPrice, 24)) + '/เดือน';
            installmentAmounts[2].textContent = formatCurrency(calculateInstallment(newPrice, 36)) + '/เดือน';
        });
    });
}

// Handle category change
function changeCategory(category) {
    currentCategory = category;

    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Show loading
    document.getElementById('products-container').innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>กำลังโหลดข้อมูลสินค้า...</p>
        </div>
    `;

    // Simulate loading delay
    setTimeout(() => {
        renderProducts(category);
    }, 500);
}

// Contact for purchase
function contactForPurchase(productName) {
    const message = `สวัสดีครับ สนใจสอบถามราคา ${productName} ครับ`;
    const lineUrl = `https://line.me/ti/p/~@yourlineid`;

    // For demo, show alert. In real app, open LINE or WhatsApp
    alert(`ต้องการสอบถาม: ${productName}\n\nกรุณาติดต่อผ่าน:\n- LINE: @yourlineid\n- Tel: 02-XXX-XXXX`);
}

// Add to comparison (placeholder)
function addToCompare(productId) {
    alert('เพิ่มในรายการเปรียบเทียบแล้ว\n\nคุณสามารถเปรียบเทียบสินค้าได้สูงสุด 3 รายการ');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Product pricing page initialized');

    // Add category tab listeners
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            changeCategory(category);
        });
    });

    // Load initial category
    setTimeout(() => {
        renderProducts('iphone');
    }, 1000);

    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Handle navbar scroll effect
window.addEventListener('scroll', function() {
    const nav = document.querySelector('.nav');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});
