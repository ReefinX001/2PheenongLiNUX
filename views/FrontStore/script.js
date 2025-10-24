// Carousel functionality with pagination
let currentPage = 0;
let totalPages = 0;
let allCategories = [];

function scrollCarousel(direction) {
    const slider = document.getElementById('productsSlider');
    const items = slider.querySelectorAll('.product-item');
    const itemsPerPage = 4;

    totalPages = Math.ceil(items.length / itemsPerPage);

    if (direction === 'left') {
        currentPage = currentPage > 0 ? currentPage - 1 : totalPages - 1;
    } else {
        currentPage = currentPage < totalPages - 1 ? currentPage + 1 : 0;
    }

    // Hide all items
    items.forEach(item => item.style.display = 'none');

    // Show items for current page
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);

    for (let i = startIndex; i < endIndex; i++) {
        if (items[i]) {
            items[i].style.display = 'flex';
        }
    }
}

// Add right-click support for Apple Products Carousel
function initAppleCarouselRightClick() {
    const carousel = document.querySelector('.apple-products-carousel.top-carousel');
    if (carousel) {
        carousel.addEventListener('contextmenu', function(e) {
            e.preventDefault(); // Prevent default context menu
            scrollCarousel('right'); // Scroll to next page
        });
    }
}

// Hero Carousel functionality
class HeroCarousel {
    constructor() {
        this.currentIndex = 0;
        this.slides = [];
        this.isLoading = true;
        this.autoSlideInterval = null;
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.initializeElements();
        this.loadHeroImages();
        this.bindEvents();
    }

    initializeElements() {
        this.slideTrack = document.getElementById('heroSlideTrack');
        this.prevBtn = document.getElementById('heroPrev');
        this.nextBtn = document.getElementById('heroNext');
        this.loadingElement = document.getElementById('heroLoading');
    }

    loadHeroImages() {
        console.log('🖼️ Hero images disabled - showing empty state');
        this.slides = [];
        this.showEmptyState();
    }

    renderSlides() {
        if (!this.slideTrack) return;

        this.slideTrack.innerHTML = '';

        // Always show 3 slides: previous, current (center), next
        const totalSlides = this.slides.length;
        const prevIndex = (this.currentIndex - 1 + totalSlides) % totalSlides;
        const nextIndex = (this.currentIndex + 1) % totalSlides;

        const slidesToShow = [
            { data: this.slides[prevIndex], position: 'prev' },
            { data: this.slides[this.currentIndex], position: 'center' },
            { data: this.slides[nextIndex], position: 'next' }
        ];

        slidesToShow.forEach((slide, index) => {
            const slideElement = document.createElement('div');
            slideElement.className = `hero-slide ${slide.position}`;

            slideElement.innerHTML = `
                <img src="${slide.data.url}" 
                     alt="${slide.data.title}" 
                     class="hero-slide-image"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600'">
                <div class="hero-slide-overlay">
                    <h3 class="hero-slide-title">${slide.data.title}</h3>
                    <p class="hero-slide-description">${slide.data.description}</p>
                </div>
            `;

            this.slideTrack.appendChild(slideElement);
        });
    }

    updateSlidePosition() {
        // For the 3-slide layout, we don't need to move the track
        // Instead, we re-render the slides with new prev/center/next
        this.renderSlides();
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        this.updateSlidePosition();
        this.resetAutoSlide();
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.updateSlidePosition();
        this.resetAutoSlide();
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.updateSlidePosition();
        this.resetAutoSlide();
    }

    startAutoSlide() {
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, 5000); // Change slide every 5 seconds
    }

    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }

    resetAutoSlide() {
        this.stopAutoSlide();
        this.startAutoSlide();
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
        this.isLoading = false;
    }

    showEmptyState() {
        if (this.loadingElement) {
            this.loadingElement.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                    <p>ไม่มีภาพสำหรับแสดง</p>
                </div>
            `;
        }
        this.hideLoading();
    }

    showError() {
        if (this.loadingElement) {
            this.loadingElement.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary);">
                    <p>ไม่สามารถโหลดภาพได้</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;">
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            `;
        }
    }

    bindEvents() {
        // Navigation buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Touch/swipe support
        if (this.slideTrack) {
            this.slideTrack.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            this.slideTrack.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            }, { passive: true });
        }

        // Pause auto-slide on hover
        if (this.slideTrack) {
            this.slideTrack.addEventListener('mouseenter', () => this.stopAutoSlide());
            this.slideTrack.addEventListener('mouseleave', () => this.startAutoSlide());
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.updateSlidePosition(), 100);
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextSlide(); // Swipe left
            } else {
                this.prevSlide(); // Swipe right
            }
        }
    }
}

// Auto-hide navigation buttons based on scroll position
function updateCarouselNavigation() {
    const slider = document.getElementById('productsSlider');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');

    if (slider) {
        const isAtStart = slider.scrollLeft <= 0;
        const isAtEnd = slider.scrollLeft >= slider.scrollWidth - slider.clientWidth;

        prevBtn.style.opacity = isAtStart ? '0.5' : '1';
        nextBtn.style.opacity = isAtEnd ? '0.5' : '1';

        prevBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';
        nextBtn.style.pointerEvents = isAtEnd ? 'none' : 'auto';
    }
}

// Product data
const productData = {
    'iphone-15-pro-max': {
        name: 'iPhone 15 Pro Max',
        basePrice: 44900,
        storage: [
            { capacity: '128GB', price: 44900 },
            { capacity: '256GB', price: 49900 },
            { capacity: '512GB', price: 59900 },
            { capacity: '1TB', price: 69900 }
        ],
        colors: [
            { name: 'Natural Titanium', class: 'titanium' },
            { name: 'Blue Titanium', class: 'blue' },
            { name: 'White Titanium', class: 'silver' },
            { name: 'Black Titanium', class: 'space-gray' }
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
        ],
        colors: [
            { name: 'Natural Titanium', class: 'titanium' },
            { name: 'Blue Titanium', class: 'blue' },
            { name: 'White Titanium', class: 'silver' },
            { name: 'Black Titanium', class: 'space-gray' }
        ]
    },
    'iphone-15': {
        name: 'iPhone 15',
        basePrice: 29900,
        storage: [
            { capacity: '128GB', price: 29900 },
            { capacity: '256GB', price: 34900 },
            { capacity: '512GB', price: 44900 }
        ],
        colors: [
            { name: 'Pink', class: 'pink' },
            { name: 'Yellow', class: 'gold' },
            { name: 'Green', class: 'green' },
            { name: 'Blue', class: 'blue' },
            { name: 'Black', class: 'space-gray' }
        ]
    },
    'iphone-14': {
        name: 'iPhone 14',
        basePrice: 24900,
        storage: [
            { capacity: '128GB', price: 24900 },
            { capacity: '256GB', price: 29900 },
            { capacity: '512GB', price: 39900 }
        ],
        colors: [
            { name: 'Blue', class: 'blue' },
            { name: 'Purple', class: 'purple' },
            { name: 'Midnight', class: 'space-gray' },
            { name: 'Starlight', class: 'silver' },
            { name: 'Red', class: 'red' }
        ]
    }
};

// Current selection
let currentProduct = null;
let selectedStorage = null;
let selectedColor = null;

// Show pricing modal
function showPricing(productId) {
    currentProduct = productData[productId];
    selectedStorage = currentProduct.storage[0]; // Default to first storage option
    selectedColor = currentProduct.colors[0]; // Default to first color

    const modal = document.getElementById('pricingModal');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = `${currentProduct.name} - ราคาและการผ่อน`;

    renderStorageOptions();
    renderColorOptions();
    updatePricing();

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close pricing modal
function closePricingModal() {
    const modal = document.getElementById('pricingModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Render storage options
function renderStorageOptions() {
    const storageButtons = document.getElementById('storageButtons');
    storageButtons.innerHTML = '';

    currentProduct.storage.forEach((storage, index) => {
        const button = document.createElement('button');
        button.className = `storage-btn ${index === 0 ? 'active' : ''}`;
        button.textContent = `${storage.capacity} - ฿${storage.price.toLocaleString()}`;
        button.onclick = () => selectStorage(storage, button);
        storageButtons.appendChild(button);
    });
}

// Render color options
function renderColorOptions() {
    const colorButtons = document.getElementById('colorButtons');
    colorButtons.innerHTML = '';

    currentProduct.colors.forEach((color, index) => {
        const button = document.createElement('button');
        button.className = `color-btn ${color.class} ${index === 0 ? 'active' : ''}`;
        button.title = color.name;
        button.onclick = () => selectColor(color, button);
        colorButtons.appendChild(button);
    });
}

// Select storage option
function selectStorage(storage, buttonElement) {
    selectedStorage = storage;

    // Update active state
    document.querySelectorAll('.storage-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    updatePricing();
}

// Select color option
function selectColor(color, buttonElement) {
    selectedColor = color;

    // Update active state
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
}

// Update pricing display
function updatePricing() {
    const price = selectedStorage.price;

    document.getElementById('totalPrice').textContent = `฿${price.toLocaleString()}`;

    // Calculate installments
    const installment12 = Math.ceil(price / 12);
    const installment24 = Math.ceil(price / 24);
    const installment36 = Math.ceil(price / 36);

    document.getElementById('installment12').textContent = `฿${installment12.toLocaleString()}/เดือน`;
    document.getElementById('installment24').textContent = `฿${installment24.toLocaleString()}/เดือน`;
    document.getElementById('installment36').textContent = `฿${installment36.toLocaleString()}/เดือน`;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('pricingModal');
    if (event.target === modal) {
        closePricingModal();
    }
};

// Smooth scrolling for anchor links
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

// Product card hover effects (moved to main DOMContentLoaded)
function initProductHoverEffects() {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe product cards
    productCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Price calculation utilities
function calculateInstallment(price, months, interestRate = 0) {
    if (interestRate === 0) {
        return Math.ceil(price / months);
    }

    const monthlyRate = interestRate / 12 / 100;
    const installment = price * monthlyRate * Math.pow(1 + monthlyRate, months) /
                      (Math.pow(1 + monthlyRate, months) - 1);
    return Math.ceil(installment);
}

// Format currency
function formatCurrency(amount) {
    return `฿${amount.toLocaleString()}`;
}

// Add to cart functionality (placeholder)
function addToCart() {
    if (!currentProduct || !selectedStorage || !selectedColor) {
        alert('กรุณาเลือกรุ่น ความจุ และสีที่ต้องการ');
        return;
    }

    const item = {
        product: currentProduct.name,
        storage: selectedStorage.capacity,
        color: selectedColor.name,
        price: selectedStorage.price
    };

    console.log('Added to cart:', item);
    alert(`เพิ่ม ${item.product} ${item.storage} สี${item.color} ลงในตะกร้าแล้ว`);
    closePricingModal();
}

// Buy now functionality (placeholder)
function buyNow() {
    if (!currentProduct || !selectedStorage || !selectedColor) {
        alert('กรุณาเลือกรุ่น ความจุ และสีที่ต้องการ');
        return;
    }

    const item = {
        product: currentProduct.name,
        storage: selectedStorage.capacity,
        color: selectedColor.name,
        price: selectedStorage.price
    };

    console.log('Buy now:', item);
    alert(`กำลังดำเนินการซื้อ ${item.product} ${item.storage} สี${item.color} ราคา ${formatCurrency(item.price)}`);
    closePricingModal();
}

// Search functionality (placeholder)
function searchProducts(query) {
    // This would typically connect to a backend API
    console.log('Searching for:', query);
}

// Comparison functionality
function compareProducts() {
    // Toggle comparison view
    const comparisonSection = document.querySelector('.comparison');
    comparisonSection.scrollIntoView({ behavior: 'smooth' });
}

// Newsletter subscription
function subscribeNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('.newsletter-input').value;

    if (!email) {
        alert('กรุณาใส่อีเมล');
        return;
    }

    // Simulate API call
    console.log('Newsletter subscription:', email);

    // Show success message
    const btn = event.target.querySelector('.newsletter-btn');
    const originalText = btn.textContent;
    btn.textContent = 'สำเร็จ! ✓';
    btn.style.background = '#4CAF50';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'white';
        event.target.reset();
    }, 2000);

    alert('ขอบคุณสำหรับการสมัครรับข่าวสาร! 🎉');
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Parallax and scroll effects
function initScrollEffects() {
    const nav = document.querySelector('.nav');
    const heroVideo = document.querySelector('.hero-video');
    const heroContent = document.querySelector('.hero-content');

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const fadeObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe elements for fade-in effects
    document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right, .scale-in').forEach(element => {
        fadeObserver.observe(element);
    });

    // Scroll event listener for parallax and navbar effects
    let ticking = false;

    function updateOnScroll() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        const heroHeight = document.querySelector('.hero').offsetHeight;

        // Parallax effect for hero video
        if (heroVideo && scrolled < heroHeight) {
            heroVideo.style.transform = `translateY(${rate}px)`;
        }

        // Parallax effect for hero content
        if (heroContent && scrolled < heroHeight) {
            const contentRate = scrolled * -0.3;
            heroContent.style.transform = `translateY(${contentRate}px)`;
        }

        // Navbar scroll effect
        if (nav) {
            if (scrolled > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }

        // Product cards staggered animation
        const productCards = document.querySelectorAll('.product-card:not(.visible)');
        productCards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight - 100) {
                setTimeout(() => {
                    card.classList.add('visible');
                }, index * 100);
            }
        });

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateOnScroll);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick);

    // Initial call
    updateOnScroll();
}

// Enhanced animations for product cards
function initProductAnimations() {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach((card, index) => {
        // Add initial classes for animations
        card.classList.add('fade-in-up');

        // Enhanced hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-12px) scale(1.02)';

            // Animate phone mockup
            const phoneMockup = this.querySelector('.phone-mockup');
            if (phoneMockup) {
                phoneMockup.style.transform = 'scale(1.05) rotateY(5deg)';
            }

            // Animate feature tags
            const featureTags = this.querySelectorAll('.feature-tag');
            featureTags.forEach((tag, tagIndex) => {
                setTimeout(() => {
                    tag.style.transform = 'translateY(-2px) scale(1.05)';
                }, tagIndex * 50);
            });
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';

            // Reset phone mockup
            const phoneMockup = this.querySelector('.phone-mockup');
            if (phoneMockup) {
                phoneMockup.style.transform = 'scale(1) rotateY(0deg)';
            }

            // Reset feature tags
            const featureTags = this.querySelectorAll('.feature-tag');
            featureTags.forEach(tag => {
                tag.style.transform = 'translateY(0) scale(1)';
            });
        });
    });
}

// FrontStore Data Management
class FrontStoreManager {
    constructor() {
        this.categories = [];
        this.promotions = [];
        this.init();
    }

    async init() {
        try {
            await this.loadCategories();
            await this.loadPromotions();
            await this.loadProducts();
            await this.loadVideoData();
        } catch (error) {
            console.error('Error initializing FrontStore:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/frontstore/categories/active');
            const data = await response.json();

            if (data.success) {
                this.categories = data.data;
                this.renderCategories();
            } else {
                console.error('Failed to load categories:', data.message);
                // Show empty state instead of fallback
                this.showEmptyCategories();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showEmptyCategories();
        }
    }

    async loadPromotions() {
        try {
            // พยายามดึงเฉพาะที่ถูกติ๊ก "แนะนำ"
            const response = await fetch('/api/frontstore/promotions/active?featured=true');
            const data = await response.json();

            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                this.promotions = data.data;
                this.renderPromotions();
                return;
            }

            // ถ้ายังว่าง ลองดึงที่เปิดใช้งานทั้งหมดมาก่อน
            try {
                const res2 = await fetch('/api/frontstore/promotions/active');
                const data2 = await res2.json();
                if (data2.success && Array.isArray(data2.data) && data2.data.length > 0) {
                    this.promotions = data2.data;
                    this.renderPromotions();
                    return;
                }
            } catch (e2) {
                console.warn('fallback load (no featured) failed:', e2);
            }

            // ว่างจริงๆ ให้แสดงข้อความว่าง
            this.showEmptyPromotions();
        } catch (error) {
            console.error('Error loading promotions:', error);
            this.showEmptyPromotions();
        }
    }

    async loadProducts() {
        try {
            // Load products for each category
            await Promise.all([
                this.loadProductsByCategory('iphone', 'cardsContainer'),
                this.loadProductsByCategory('ipad', 'cardsContainer2'),
                this.loadProductsByCategory('android', 'cardsContainer3'),
                this.loadProductsByCategory('accessories', 'cardsContainer4')
            ]);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    async loadProductsByCategory(category, containerId) {
        try {
            const response = await fetch(`/api/frontstore/products?category=${category}&isActive=true`);
            const data = await response.json();

            const container = document.getElementById(containerId);
            if (!container) return;

            if (data.success && data.data && data.data.length > 0) {
                container.innerHTML = data.data.map(product => {
                    // Check if the media is a video (improved detection)
                    const isVideo = product.image && (
                        product.image.toLowerCase().includes('.mp4') ||
                        product.image.toLowerCase().includes('.webm') ||
                        product.image.toLowerCase().includes('.mov') ||
                        product.image.toLowerCase().includes('.avi') ||
                        product.image.toLowerCase().includes('video')
                    );

                    console.log('FrontStore Product:', product.name, 'Image:', product.image, 'IsVideo:', isVideo);

                    const mediaElement = isVideo ?
                        `<video class="card-video" autoplay muted loop playsinline preload="metadata" 
                                style="width: 100%; height: 100%; object-fit: cover;" 
                                onloadstart="console.log('FrontStore Video loading:', '${product.image}')"
                                onerror="console.error('FrontStore Video error:', '${product.image}'); this.style.display='none'; this.nextElementSibling.style.display='block';">
                           <source src="${product.image}" type="video/${product.image.split('.').pop().toLowerCase()}">
                           Your browser does not support the video tag.
                         </video>
                         <img src="${product.thumbnail || '/views/FrontStore/Logo2png.png'}" alt="${product.name || 'Product'}" 
                              style="width: 100%; height: 100%; object-fit: cover; display: none;" loading="lazy" 
                              onerror="this.onerror=null;this.src='/views/FrontStore/Logo2png.png';"/>` :
                        `<img src="${product.image}" alt="${product.name || 'Product'}" loading="lazy" 
                             style="width: 100%; height: 100%; object-fit: cover;" 
                             onerror="this.onerror=null;this.src='/views/FrontStore/Logo2png.png';"/>`;

                    return `
                        <div class="apple-card ${product.isFeatured ? 'featured-card' : ''}">
                            ${(product.subtitle || !product.name.startsWith('Product') || product.tagline || product.price) ? `
                            <div class="card-header">
                                ${product.subtitle ? `<p class="card-subtitle">${product.subtitle}</p>` : ''}
                                ${!product.name.startsWith('Product') ? `<h3 class="card-title">${product.name}</h3>` : ''}
                                ${product.tagline ? `<p class="card-tagline">${product.tagline}</p>` : ''}
                                ${product.price ? `<p class="card-price">${product.price}</p>` : ''}
                            </div>
                            ` : ''}
                            <div class="card-image">
                                ${mediaElement}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                // Show empty state instead of fallback
                container.innerHTML = '<div class="empty-state">ยังไม่มีสินค้าในหมวดหมู่นี้</div>';
            }
        } catch (error) {
            console.error(`Error loading ${category} products:`, error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div class="empty-state">ไม่สามารถโหลดสินค้าได้</div>';
            }
        }
    }

    showEmptyCategories() {
        const container = document.getElementById('productsSlider');
        if (!container) return;

        container.innerHTML = '<div class="empty-state">ยังไม่มีหมวดหมู่สินค้า</div>';
    }

    renderCategories() {
        const container = document.getElementById('productsSlider');
        if (!container) return;

        container.innerHTML = this.categories.map((category, index) => `
            <div class="product-item ${index === 1 ? 'active' : ''}" data-category="${category.slug}">
                ${category.icon ?
                    `<img src="${category.icon}" alt="${category.name}" loading="lazy">` :
                    `<div class="default-icon" style="background-color: ${category.color}; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
                        <i class="fas fa-tag"></i>
                    </div>`
                }
                <span>${category.name}</span>
            </div>
        `).join('');

        // Initialize pagination
        this.initializePagination();

        // Add click events for categories
        container.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', () => {
                const categorySlug = item.dataset.category;
                this.filterByCategory(categorySlug);

                // Update active state
                container.querySelectorAll('.product-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    initializePagination() {
        const slider = document.getElementById('productsSlider');
        const items = slider.querySelectorAll('.product-item');
        const itemsPerPage = 4;

        // Hide all items initially
        items.forEach(item => item.style.display = 'none');

        // Show first 4 items
        for (let i = 0; i < Math.min(itemsPerPage, items.length); i++) {
            if (items[i]) {
                items[i].style.display = 'flex';
            }
        }

        // Reset current page
        currentPage = 0;
        totalPages = Math.ceil(items.length / itemsPerPage);
    }

    async loadVideoData() {
        try {
            const response = await fetch('/api/frontstore/video');
            const data = await response.json();

            if (data.success && data.data) {
                this.updateVideoSection(data.data);
            }
        } catch (error) {
            console.error('Error loading video data:', error);
            // Keep default video if API fails
        }
    }

    updateVideoSection(videoData) {
        const titleElement = document.querySelector('.video-section .section-title');
        const subtitleElement = document.querySelector('.video-section .section-subtitle');
        const videoElement = document.querySelector('.video-section video source');

        if (titleElement && videoData.title) {
            titleElement.textContent = videoData.title;
        }
        if (subtitleElement && videoData.subtitle) {
            subtitleElement.textContent = videoData.subtitle;
        }
        if (videoElement && videoData.videoUrl) {
            videoElement.src = videoData.videoUrl;
            videoElement.parentElement.load(); // Reload video with new source
        }
    }

    renderPromotions() {
        const container = document.getElementById('promotionCards');
        if (!container) return;

        container.innerHTML = this.promotions.map((promotion, index) => {
            const imgSrc = promotion.thumbnailImage || promotion.image;

            return `
                <div class="apple-card promotion-card" 
                     onclick="frontStoreManager.handlePromotionClick('${promotion._id}', '${promotion.link || '#'}')">
                    <div class="card-image">
                         <img 
   src="${imgSrc}" 
   alt="${promotion.title || 'โปรโมชั่น'}"
   loading="lazy" decoding="async">
                    </div>
                </div>
            `;
        }).join('');

        // ทำให้แต่ละการ์ดมี aspect-ratio = อัตราส่วนจริงของโปสเตอร์
        requestAnimationFrame(() => {
            container.querySelectorAll('.promotion-card img').forEach(img => {
                const apply = () => {
                    const w = img.naturalWidth, h = img.naturalHeight;
                    img.closest('.promotion-card')?.style.setProperty('--poster-ar', `${w}/${h}`);
                };
                if (img.complete) apply();
                else img.addEventListener('load', apply, { once: true });
            });
        });
    }

    showEmptyPromotions() {
        const container = document.querySelector('.cards-container');
        if (!container) return;

        container.innerHTML = '<div class="empty-state">ยังไม่มีโปรโมชั่น</div>';
    }

    async handlePromotionClick(promotionId, link) {
        try {
            // Track click
            await fetch(`/api/frontstore/promotions/${promotionId}/click`, {
                method: 'POST'
            });

            // Navigate if link exists
            if (link && link !== '#') {
                if (link.startsWith('http')) {
                    window.open(link, '_blank');
                } else {
                    window.location.href = link;
                }
            }
        } catch (error) {
            console.error('Error handling promotion click:', error);
        }
    }

    filterByCategory(categorySlug) {
        // This would filter products by category
        // Implementation depends on your product listing structure
        console.log('Filtering by category:', categorySlug);
    }

    initializePagination() {
        const slider = document.getElementById('productsSlider');
        if (!slider) return;

        const items = slider.querySelectorAll('.product-item');
        const itemsPerPage = 4;

        // Hide all items initially
        items.forEach(item => item.style.display = 'none');

        // Show first 4 items
        for (let i = 0; i < Math.min(itemsPerPage, items.length); i++) {
            if (items[i]) {
                items[i].style.display = 'flex';
            }
        }

        // Reset current page
        currentPage = 0;
        totalPages = Math.ceil(items.length / itemsPerPage);
    }
}

// Initialize FrontStore Manager
const frontStoreManager = new FrontStoreManager();

// Consolidated initialization
function initializeApp() {
    console.log('iPhone Pricing App initialized');

    // Initialize Hero Carousel
    window.heroCarousel = new HeroCarousel();

    // Initialize top carousel navigation
    const slider = document.getElementById('productsSlider');
    if (slider) {
        slider.addEventListener('scroll', updateCarouselNavigation);
        updateCarouselNavigation(); // Initial check
    }

    // Initialize Apple Products Carousel right-click support
    initAppleCarouselRightClick();

    // Initialize Promotion Carousel hover events and auto-slide
    initPromotionCarouselHover();
    startPromotionAutoSlide(); // เปิดใช้งาน auto-slide

    // Initialize product hover effects
    initProductHoverEffects();

    // Initialize all other effects
    initSmoothScrolling();
    initScrollEffects();
    initProductAnimations();

    // Initialize carousel buttons
    updateCarouselButtons();

    // Add fade-in classes to elements
    const elementsToAnimate = [
        '.feature-card',
        '.testimonial-card',
        '.product-card'
    ];

    elementsToAnimate.forEach(selector => {
        document.querySelectorAll(selector).forEach((element, index) => {
            element.classList.add('fade-in-up');
            element.style.transitionDelay = `${index * 0.1}s`;
        });
    });

    // Add event listeners to modal action buttons
    const addToCartBtn = document.querySelector('.modal-actions .btn-primary');
    const buyNowBtn = document.querySelector('.modal-actions .btn-secondary');

    if (addToCartBtn) {
        addToCartBtn.onclick = addToCart;
    }

    if (buyNowBtn) {
        buyNowBtn.onclick = buyNow;
    }

    // Enhanced modal animations
    const modal = document.getElementById('pricingModal');
    if (modal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style') {
                    const display = window.getComputedStyle(modal).display;
                    if (display === 'block') {
                        // Add staggered animation to modal content
                        const animatedElements = modal.querySelectorAll('.storage-btn, .color-btn, .installment-option');
                        animatedElements.forEach((element, index) => {
                            element.style.opacity = '0';
                            element.style.transform = 'translateY(20px)';
                            setTimeout(() => {
                                element.style.transition = 'all 0.3s ease';
                                element.style.opacity = '1';
                                element.style.transform = 'translateY(0)';
                            }, index * 50);
                        });
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true });
    }

    // Initialize touch support for carousel
    const cardsContainer = document.getElementById('cardsContainer');
    if (cardsContainer) {
        cardsContainer.addEventListener('touchstart', function(e) {
            window.touchStartX = e.changedTouches[0].screenX;
        });

        cardsContainer.addEventListener('touchend', function(e) {
            window.touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        window.currentSlide = 0;
        const container = document.getElementById('cardsContainer');
        if (container) {
            container.style.transform = 'translateX(0px)';
        }
        updateCarouselButtons();
    });

    // Initialize review system
    initReviewSystem();

    // Initialize Front Store Manager to load promotions and products
    frontStoreManager.init();
}

// Single DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', initializeApp);

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    stopPromotionAutoSlide();
});

// Cleanup when page visibility changes (tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPromotionAutoSlide();
    } else {
        // Restart auto-slide when tab becomes visible again
        setTimeout(() => {
            if (!isPromotionHovered) {
                startPromotionAutoSlide();
            }
        }, 1000);
    }
});

// Flex Card Carousel functionality - Apple Store Style
let currentSlides = {}; // เก็บ slide index ของแต่ละ container
const cardWidth = 412; // 400px card + 12px gap
const promotionCardWidth = 320; // 300px card + 20px margin สำหรับโปรโมชั่นเพื่อให้แสดง 4 การ์ด

function slideCards(containerSelector, direction) {
    // รองรับทั้งแบบเก่า (backward compatible) และแบบใหม่
    if (typeof containerSelector === 'string' && !direction) {
        // แบบเก่า: slideCards('next') หรือ slideCards('prev')
        direction = containerSelector;
        containerSelector = '#cardsContainer'; // default container
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`Container ${containerSelector} not found`);
        return;
    }

    // Initialize slide index for this container if not exists
    if (!(containerSelector in currentSlides)) {
        currentSlides[containerSelector] = 0;
    }

    const cards = container.querySelectorAll('.apple-card');
    const totalCards = cards.length;
    const containerWidth = container.parentElement.clientWidth;
    const visibleCards = Math.floor(containerWidth / cardWidth);
    const maxSlide = Math.max(0, totalCards - visibleCards);

    if (direction === 'next') {
        currentSlides[containerSelector] = Math.min(currentSlides[containerSelector] + 1, maxSlide);
    } else if (direction === 'prev') {
        currentSlides[containerSelector] = Math.max(currentSlides[containerSelector] - 1, 0);
    }

    const translateX = currentSlides[containerSelector] * cardWidth;
    container.style.transform = `translateX(-${translateX}px)`;

    updateCarouselButtons(containerSelector);
}

function updateCarouselButtons(containerSelector = '#cardsContainer') {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const cards = container.querySelectorAll('.apple-card');
    const totalCards = cards.length;
    const containerWidth = container.parentElement.clientWidth;
    const visibleCards = Math.floor(containerWidth / cardWidth);
    const maxSlide = Math.max(0, totalCards - visibleCards);

    // หาปุ่มที่เกี่ยวข้องกับ container นี้
    const carouselSection = container.closest('.flex-card-carousel, .promotion-carousel-section');
    const prevBtn = carouselSection?.querySelector('.carousel-btn-prev');
    const nextBtn = carouselSection?.querySelector('.carousel-btn-next');

    if (prevBtn && nextBtn) {
        const currentSlide = currentSlides[containerSelector] || 0;

        prevBtn.style.opacity = currentSlide === 0 ? '0.5' : '1';
        nextBtn.style.opacity = currentSlide >= maxSlide ? '0.5' : '1';

        prevBtn.style.pointerEvents = currentSlide === 0 ? 'none' : 'auto';
        nextBtn.style.pointerEvents = currentSlide >= maxSlide ? 'none' : 'auto';
    }
}

// Promotion Cards Carousel functionality
let currentPromotionSlide = 0;
let promotionAutoSlideInterval = null;
let isPromotionHovered = false;

function scrollPromotions(direction) {
    const container = document.getElementById('promotionCards');
    const cards = container.querySelectorAll('.apple-card');
    const totalCards = cards.length;

    // ปิดใช้งาน carousel - แสดงการ์ดทั้งหมดโดยไม่จำกัด
    // รีเซ็ตตำแหน่งเป็น 0 และไม่มีการเลื่อน
    currentPromotionSlide = 0;
    container.style.transform = `translateX(0px)`;

    // อัปเดตปุ่มให้ซ่อน/ปิดใช้งาน
    updatePromotionCarouselButtons();

    // หยุด auto-slide เนื่องจากไม่ต้องเลื่อนแล้ว
    stopPromotionAutoSlide();
}

function updatePromotionCarouselButtons() {
    const container = document.getElementById('promotionCards');
    const cards = container.querySelectorAll('.apple-card');
    const totalCards = cards.length;

    const section = document.querySelector('.promotion-carousel-section');
    const prevBtn = section?.querySelector('.carousel-btn-prev');
    const nextBtn = section?.querySelector('.carousel-btn-next');

    // ซ่อนปุ่ม carousel เนื่องจากแสดงการ์ดทั้งหมดแล้ว
    if (prevBtn && nextBtn) {
        prevBtn.style.opacity = '0.3';
        nextBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
        nextBtn.style.pointerEvents = 'none';
        // เพิ่มการซ่อนปุ่มอย่างสมบูรณ์ (ถ้าต้องการ)
        // prevBtn.style.display = 'none';
        // nextBtn.style.display = 'none';
    }
}

// Auto-slide functionality for promotions - เปิดใช้งานสำหรับการเลื่อนอัตโนมัติ
function startPromotionAutoSlide() {
    if (promotionAutoSlideInterval) {
        clearInterval(promotionAutoSlideInterval);
    }

    const promotionSection = document.querySelector('.promotion-carousel-section');
    const container = document.getElementById('promotionCards');

    if (!container) return;

    promotionAutoSlideInterval = setInterval(() => {
        if (!isPromotionHovered) {
            const cardsWrapper = container.parentElement;
            const scrollWidth = container.scrollWidth;
            const clientWidth = cardsWrapper.clientWidth;

            // เพิ่ม visual indicator
            if (promotionSection) {
                promotionSection.classList.add('auto-sliding');
            }

            // ถ้า scroll ถึงจุดสุดท้ายแล้ว กลับไปจุดเริ่มต้น
            if (cardsWrapper.scrollLeft >= scrollWidth - clientWidth - 50) {
                cardsWrapper.scrollTo({
                    left: 0,
                    behavior: 'smooth'
                });
            } else {
                // เลื่อนไปข้างหน้า 320px (ความกว้างของการ์ด 1 ใบ)
                cardsWrapper.scrollBy({
                    left: 320,
                    behavior: 'smooth'
                });
            }

            // ลบ visual indicator หลังจาก animation เสร็จ
            setTimeout(() => {
                if (promotionSection) {
                    promotionSection.classList.remove('auto-sliding');
                }
            }, 500);
        }
    }, 3000); // เลื่อนทุก 3 วินาที

    console.log('Auto-slide enabled for promotions');
}

function stopPromotionAutoSlide() {
    if (promotionAutoSlideInterval) {
        clearInterval(promotionAutoSlideInterval);
        promotionAutoSlideInterval = null;
    }

    const promotionSection = document.querySelector('.promotion-carousel-section');
    if (promotionSection) {
        promotionSection.classList.remove('auto-sliding');
    }
}

// Initialize promotion carousel hover events - ปรับให้รองรับ auto-slide
function initPromotionCarouselHover() {
    const promotionSection = document.querySelector('.promotion-carousel-section');
    if (promotionSection) {
        promotionSection.addEventListener('mouseenter', () => {
            isPromotionHovered = true;
            promotionSection.classList.add('paused');
            stopPromotionAutoSlide(); // หยุด auto-slide เมื่อ hover
        });

        promotionSection.addEventListener('mouseleave', () => {
            isPromotionHovered = false;
            promotionSection.classList.remove('paused');
            // เริ่ม auto-slide ใหม่หลังจากออกจาก hover
            setTimeout(() => {
                if (!isPromotionHovered) {
                    startPromotionAutoSlide();
                }
            }, 500);
        });
    }
}

// Auto-slide functionality (optional)
function autoSlide() {
    const container = document.getElementById('cardsContainer');
    if (container) {
        const cards = container.querySelectorAll('.apple-card');
        const totalCards = cards.length;
        const containerWidth = container.parentElement.clientWidth;
        const visibleCards = Math.floor(containerWidth / cardWidth);
        const maxSlide = Math.max(0, totalCards - visibleCards);

        if (currentSlide >= maxSlide) {
            currentSlide = 0;
        } else {
            currentSlide++;
        }

        const translateX = currentSlide * cardWidth;
        container.style.transform = `translateX(-${translateX}px)`;
        updateCarouselButtons();
    }
}

// Touch/swipe support for mobile (moved to main initialization)
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
    const swipeThreshold = 50;
    const difference = touchStartX - touchEndX;

    if (Math.abs(difference) > swipeThreshold) {
        if (difference > 0) {
            // Swipe left - go to next
            slideCards('next');
        } else {
            // Swipe right - go to prev
            slideCards('prev');
        }
    }
}

// Real-time Review Gallery Script
// ใช้ server proxy แทนการเรียก Google Apps Script โดยตรง
const REVIEW_API = '/api/reviews';

let reviews = [], currentIdx = 0, reviewAutoSlide, isAuto = true;

async function fetchReviews(){
  try {
    console.log('📡 Fetching reviews from server proxy…');
    const res = await fetch(`${REVIEW_API}?t=${Date.now()}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log('📋 Raw data:', data);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No review data received');
    }

    reviews = data;
    console.log(`✅ Loaded ${reviews.length} reviews`);

    // แสดงข้อมูลวันที่ถ้ามี (สำหรับ debug)
    if (reviews.length > 0 && reviews[0].uploadDate) {
      console.log(`📅 Showing images from date: ${reviews[0].uploadDate}`);
    }
  } catch(err) {
    console.error('❌ fetchReviews error:', err);
    // Show empty state instead of fallback
    reviews = [];
    console.log('📝 No reviews available');
  }
  currentIdx = 0;
  updateView();
  renderIndicators();
}




// แสดงภาพเท่านั้น ไม่มีข้อความ
function updateView(){
  const load = document.getElementById('carousel-loading');
  const cap  = document.getElementById('review-caption');
  const img = document.getElementById('review-image');

  if (reviews.length === 0) {
    load.style.display = 'flex';
    load.innerHTML = '<p>ยังไม่มีรีวิวให้แสดง</p>';
    cap.style.display = 'none';
    if (img) img.style.display = 'none';
    return;
  }

  if (!img || !cap || !load) {
    console.error('❌ Missing required DOM elements');
    return;
  }

  // ซ่อนข้อความ caption เพราะต้องการแสดงเฉพาะภาพ
  cap.style.display = 'none';

  // Show minimal loading state
  load.style.display = 'none';
  console.log(`🖼️ Loading image ${currentIdx + 1}/${reviews.length}:`, reviews[currentIdx].url);

  // Handle image loading with smart URL processing
  const originalUrl = reviews[currentIdx].url;

  if (!originalUrl) {
    console.log('📝 No image URL available');
    img.style.display = 'none';
    renderIndicators();
    return;
  }

  // Process URL to determine if it needs proxy
  let finalImageUrl = originalUrl;

  // Decode the proxy URL to get the original URL
  if (originalUrl.includes('/api/image-proxy?url=')) {
    try {
      const urlParams = new URLSearchParams(originalUrl.split('?')[1]);
      const decodedUrl = decodeURIComponent(urlParams.get('url') || '');

      // Check if it's a data URL (base64) - use directly, no proxy needed
      if (decodedUrl.startsWith('data:')) {
        finalImageUrl = decodedUrl;
        console.log('📋 Using data URL directly (no proxy needed)');
      }
      // Check if it's a video file - skip entirely
      else if (decodedUrl.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
        console.log('🎥 Skipping video file:', decodedUrl);
        img.style.display = 'none';
        renderIndicators();
        return;
      }
      // Otherwise use the proxy URL as is
      else {
        finalImageUrl = originalUrl;
        console.log('🔗 Using proxy for external URL');
      }
    } catch (error) {
      console.log('⚠️ Error processing proxy URL, using original:', error);
      finalImageUrl = originalUrl;
    }
  }

  console.log('🖼️ Final image URL:', finalImageUrl);

  // Try to load image
  const tmp = new Image();
  let loaded = false;

  tmp.onload = () => {
    if (!loaded) {
      loaded = true;
      console.log('✅ Image loaded successfully');
      img.src = finalImageUrl;
      img.style.display = 'block';
      renderIndicators();
    }
  };

  tmp.onerror = () => {
    if (!loaded) {
      loaded = true;
      console.log('📝 Image failed to load');
      img.style.display = 'none';
      renderIndicators();
    }
  };

  // Set timeout to prevent hanging
  setTimeout(() => {
    if (!loaded) {
      loaded = true;
      console.log('⏰ Image load timeout');
      img.style.display = 'none';
      renderIndicators();
    }
  }, 3000);

  tmp.src = finalImageUrl;
}

// สร้าง indicator dots
function renderIndicators(){
  const dots = document.getElementById('carousel-indicators');
  dots.innerHTML = '';
  reviews.forEach((_,i)=>{
    const btn = document.createElement('button');
    btn.className = i===currentIdx ? 'indicator-dot active' : 'indicator-dot';
    btn.onclick = ()=>{ currentIdx=i; updateView(); resetAuto(); };
    dots.append(btn);
  });
}

// ปุ่ม prev/next
function prev(){ currentIdx = (currentIdx-1+reviews.length)%reviews.length; updateView(); resetAuto(); }
function next(){ currentIdx = (currentIdx+1)%reviews.length; updateView(); resetAuto(); }

// Auto-slide
function startAuto(){
  clearInterval(reviewAutoSlide);
  reviewAutoSlide = setInterval(()=>{ if(isAuto) next(); }, 5000);
}
function resetAuto(){ isAuto=true; startAuto(); }
function pauseAuto(){ isAuto=false; }

// Review system initialization (moved to main initialization)
async function initReviewSystem() {
  console.log('🚀 Real-time review system starting...');

  // ตรวจสอบว่า DOM elements มีอยู่จริงไหม (เฉพาะที่จำเป็นสำหรับการแสดงภาพ)
  const requiredElements = ['review-carousel', 'review-image', 'review-caption', 'carousel-loading', 'prev-review', 'next-review', 'carousel-indicators'];
  const missing = requiredElements.filter(id => !document.getElementById(id));

  if (missing.length > 0) {
    console.error('❌ Missing DOM elements:', missing);
    return;
  }

  console.log('✅ All DOM elements found');

  await fetchReviews();
  updateView();
  startAuto();
  setInterval(fetchReviews,60000);

  document.getElementById('prev-review').onclick = prev;
  document.getElementById('next-review').onclick = next;
  const car = document.getElementById('review-carousel');
  car.addEventListener('mouseenter', pauseAuto);
  car.addEventListener('mouseleave', resetAuto);
  document.addEventListener('visibilitychange', ()=> document.hidden?pauseAuto():resetAuto());

  console.log('🎉 Real-time review system initialized successfully!');
}

// Static promotion fallback removed - using dynamic data from FrontStoreManager class