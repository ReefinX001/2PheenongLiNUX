// FrontStore Admin JavaScript
class FrontStoreAdmin {
    constructor() {
        this.currentSection = 'categories';
        this.categories = [];
        this.promotions = [];
        this.currentPage = 1;
        this.limit = 10;
        // Content Management properties
        this.currentContentTab = 'contact';
        this.contactLocations = [];
        this.jobs = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showSection('categories');
        this.loadCategories();
    }

    setupEventListeners() {
        // Category form
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });

        // Promotion form
        document.getElementById('promotionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePromotion();
        });

        // File upload previews
        document.getElementById('categoryIcon').addEventListener('change', (e) => {
            this.previewImage(e.target, 'categoryIconPreview');
        });

        document.getElementById('promotionImage').addEventListener('change', (e) => {
            this.previewImage(e.target, 'promotionImagePreview');
        });

        // Search events
        document.getElementById('category-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchCategories();
            }
        });

        document.getElementById('promotion-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPromotions();
            }
        });
    }

    showSection(section, targetElement = null) {
        try {
            // Hide all admin sections
            document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');

            // Show selected section
            const sectionElement = document.getElementById(`${section}-section`);
            if (sectionElement) sectionElement.style.display = 'block';

            // Sidebar active state
            document.querySelectorAll('.admin-menu a').forEach(a => a.classList.remove('active'));
            if (targetElement) {
                targetElement.classList.add('active');
            } else {
                // auto select first link if none
                const sectionIndex = {
                    'categories': 1,
                    'promotions': 2,
                    'video': 3,
                    'products': 4,
                    'content': 5
                };
                const first = document.querySelector(`.admin-menu a:nth-child(${sectionIndex[section] || 1})`);
                if (first) first.classList.add('active');
            }

            this.currentSection = section;
            this.currentPage = 1;

            if (section === 'categories') {
                this.loadCategories();
            } else if (section === 'promotions') {
                this.loadPromotions();
                this.loadCategoriesForSelect();
            } else if (section === 'video') {
                // Video section loaded, no additional loading required
            } else if (section === 'products') {
                // Load iPhone products by default when entering products section
                setTimeout(() => {
                    loadProductsByCategory('iphone');
                }, 100);
            } else if (section === 'content') {
                // Load contact locations by default when entering content section
                setTimeout(() => {
                    this.loadContactLocations();
                }, 100);
            }
        } catch (error) {
            console.error('Error in showSection:', error);
        }
    }

    showLoading() {
        const el = document.getElementById('loadingOverlay');
        if (!el) return;
        el.classList.add('show');
    }

    hideLoading() {
        const el = document.getElementById('loadingOverlay');
        if (!el) return;
        el.classList.remove('show');
    }

    showAlert(message, type = 'success') {
        const wrap = document.createElement('div');
        wrap.style.position = 'fixed';
        wrap.style.top = '24px';
        wrap.style.right = '24px';
        wrap.style.zIndex = '4000';
        wrap.style.maxWidth = '320px';
        wrap.style.padding = '16px 20px 17px';
        wrap.style.borderRadius = '18px';
        wrap.style.fontSize = '14px';
        wrap.style.lineHeight = '1.45';
        wrap.style.fontWeight = '500';
        wrap.style.boxShadow = '0 8px 30px -10px rgba(0,0,0,.25)';
        wrap.style.backdropFilter = 'blur(12px)';
        wrap.style.border = '1px solid var(--border-light)';
        wrap.style.background = type === 'success' ? 'linear-gradient(145deg,#ffffff, #F0FFF5)' : 'linear-gradient(145deg,#ffffff,#FFF5F5)';
        wrap.style.color = 'var(--text-primary)';
        wrap.innerHTML = `<strong style="display:block; font-size:13px; letter-spacing:.5px; text-transform:uppercase; margin-bottom:4px; color:${type==='success'?'#047857':'#B91C1C'}">${type==='success'?'สำเร็จ':'ผิดพลาด'}</strong>${message}`;
        document.body.appendChild(wrap);
        setTimeout(()=>wrap.remove(), 3400);
    }

    previewImage(input, previewId) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';

        if (input.files && input.files[0]) {
            const file = input.files[0];

            // File size validation (5MB for images, 100MB for videos)
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const maxImageSize = 5 * 1024 * 1024; // 5MB
            const maxVideoSize = 100 * 1024 * 1024; // 100MB

            if (isImage && file.size > maxImageSize) {
                this.showMessage('ไฟล์รูปภาพใหญ่เกินไป (ขีดจำกัด 5MB) กรุณาย่อขนาดไฟล์หรือใช้เครื่องมือบีบอัดรูปภาพ', 'error');
                input.value = '';
                return;
            }

            if (isVideo && file.size > maxVideoSize) {
                this.showMessage('ไฟล์วิดีโอใหญ่เกินไป (ขีดจำกัด 100MB) กรุณาย่อขนาดไฟล์หรือใช้เครื่องมือบีบอัดวิดีโอ', 'error');
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (isImage) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'image-preview';
                    preview.appendChild(img);
                } else if (isVideo) {
                    const video = document.createElement('video');
                    video.src = e.target.result;
                    video.className = 'video-preview';
                    video.controls = true;
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '200px';
                    preview.appendChild(video);
                }
            };
            reader.readAsDataURL(file);
        }
    }

    // Category Management
    async loadCategories() {
        try {
            this.showLoading();
            const search = document.getElementById('category-search').value;
            const isActive = document.getElementById('category-status-filter').value;

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit
            });

            if (search) params.append('search', search);
            if (isActive !== '') params.append('isActive', isActive);

            const response = await fetch(`/api/frontstore/categories?${params}`);
            const data = await response.json();

            if (data.success) {
                this.categories = data.data;
                this.renderCategories();
                this.renderCategoriesPagination(data.pagination);
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderCategories() {
        const container = document.getElementById('categories-list');
        const empty = document.getElementById('categories-empty');
        if (!this.categories.length) {
            if (empty) empty.style.display = 'block';
            container.querySelectorAll('.item-card').forEach(c=>c.remove());
            return;
        }
        if (empty) empty.style.display = 'none';
        container.innerHTML = this.categories.map(category => {
            const iconBlock = category.icon ? `<img src="${category.icon}" alt="${category.name}" class="preview-image" style="width:64px; height:64px;">` : `<div style="width:64px;height:64px; border-radius:18px; background:${category.color}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:20px;"><i class='fa-solid fa-tag'></i></div>`;
            return `
            <div class="item-card">
                <div class="actions">
                    <button class="icon-btn" title="แก้ไข" onclick="admin.editCategory('${category._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn" title="ลบ" onclick="admin.deleteCategory('${category._id}', '${category.name}')"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div style="display:flex; gap:20px;">
                    ${iconBlock}
                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                            <h4 style="margin:0; font-size:16px; font-weight:600;">${category.name}</h4>
                            ${category.name_en ? `<span class="pill" style="background:var(--light-gray);">${category.name_en}</span>` : ''}
                            <span class="pill" style="background:${category.isActive? 'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'}; color:${category.isActive? '#047857':'#B91C1C'};">${category.isActive? 'เปิดใช้งาน':'ปิดใช้งาน'}</span>
                            <span class="pill" style="background:var(--soft-blue);">ลำดับ: ${category.order}</span>
                        </div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">${category.description || 'ไม่มีคำอธิบาย'}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    renderCategoriesPagination(pagination) {
        const container = document.getElementById('categories-pagination');
        if (!pagination || pagination.pages <= 1) { container.innerHTML = ''; return; }
        let btns = '';
        for (let i=1;i<=pagination.pages;i++) {
            btns += `<button onclick="admin.goToPage(${i})" style="border:1px solid var(--border-light); background:${i===pagination.page?'var(--primary-blue)':'#fff'}; color:${i===pagination.page?'#fff':'var(--text-primary)'}; padding:10px 16px; border-radius:14px; font-size:13px; font-weight:500; cursor:pointer; margin:0 4px 8px; box-shadow:0 3px 10px -4px var(--shadow-light);">${i}</button>`;
        }
        container.innerHTML = `<div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
            <div style="font-size:12px; color:var(--text-secondary);">แสดง ${pagination.page} / ${pagination.pages} หน้า • ทั้งหมด ${pagination.total} รายการ</div>
            <div style="display:flex; flex-wrap:wrap; justify-content:center;">${btns}</div>
        </div>`;
    }

    async saveCategory() {
        try {
            this.showLoading();
            const form = document.getElementById('categoryForm');
            const formData = new FormData(form);
            // Normalize numeric & boolean values to avoid backend casting issues (multipart sends strings)
            const orderVal = formData.get('order');
            if (orderVal !== null) {
                const parsed = parseInt(orderVal, 10);
                formData.set('order', isNaN(parsed) ? '0' : String(parsed));
            }
            // Checkbox presence: send explicit true/false
            formData.set('isActive', document.getElementById('categoryActive').checked ? 'true' : 'false');
            const categoryId = document.getElementById('categoryId').value;

            const url = categoryId ? `/api/frontstore/categories/${categoryId}` : '/api/frontstore/categories';
            const method = categoryId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.closeCategoryModal();
                this.loadCategories();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            this.showAlert('เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editCategory(id) {
        try {
            const response = await fetch(`/api/frontstore/categories/${id}`);
            const data = await response.json();

            if (data.success) {
                const category = data.data;
                document.getElementById('categoryId').value = category._id;
                document.getElementById('categoryName').value = category.name;
                document.getElementById('categoryNameEn').value = category.name_en || '';
                document.getElementById('categoryDescription').value = category.description || '';
                document.getElementById('categoryColor').value = category.color;
                document.getElementById('categoryOrder').value = category.order;
                document.getElementById('categoryActive').checked = category.isActive;

                if (category.icon) {
                    const preview = document.getElementById('categoryIconPreview');
                    preview.innerHTML = `<img src="${category.icon}" class="image-preview">`;
                }

                document.getElementById('categoryModalTitle').textContent = 'แก้ไขหมวดหมู่';
                document.getElementById('categoryIcon').removeAttribute('required');
                this.openCategoryModal();
            }
        } catch (error) {
            console.error('Error loading category:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        }
    }

    async deleteCategory(id, name) {
        if (!confirm(`คุณต้องการลบหมวดหมู่ "${name}" หรือไม่?`)) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/frontstore/categories/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.loadCategories();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showAlert('เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            this.hideLoading();
        }
    }

    openCategoryModal() {
        document.getElementById('categoryModal').classList.add('show');
    }

    closeCategoryModal() {
        document.getElementById('categoryModal').classList.remove('show');
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryIconPreview').innerHTML = '';
        document.getElementById('categoryModalTitle').textContent = 'เพิ่มหมวดหมู่ใหม่';
        document.getElementById('categoryIcon').setAttribute('required', 'required');
    }

    searchCategories() {
        this.currentPage = 1;
        this.loadCategories();
    }

    // Promotion Management
    async loadPromotions() {
        try {
            this.showLoading();
            const search = document.getElementById('promotion-search').value;
            const promotionType = document.getElementById('promotion-type-filter').value;
            const isActive = document.getElementById('promotion-status-filter').value;

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit
            });

            if (search) params.append('search', search);
            if (promotionType) params.append('promotionType', promotionType);
            if (isActive !== '') params.append('isActive', isActive);

            const response = await fetch(`/api/frontstore/promotions?${params}`);
            const data = await response.json();

            if (data.success) {
                this.promotions = data.data;
                this.renderPromotions();
                this.renderPromotionsPagination(data.pagination);
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
            }
        } catch (error) {
            console.error('Error loading promotions:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderPromotions() {
        const container = document.getElementById('promotions-list');
        const empty = document.getElementById('promotions-empty');
        if (!this.promotions.length) {
            if (empty) empty.style.display = 'block';
            container.querySelectorAll('.item-card').forEach(c=>c.remove());
            return;
        }
        if (empty) empty.style.display = 'none';
        container.innerHTML = this.promotions.map(promotion => {
            const img = `<img src="${promotion.thumbnailImage || promotion.image}" alt="${promotion.title}" style="width:132px; height:90px; object-fit:cover; border-radius:18px; border:1px solid var(--border-light); box-shadow:0 4px 14px -6px var(--shadow-light);" />`;
            const timeInfo = [
                promotion.price? `ราคา: ${promotion.price}`: '',
                promotion.startDate? `เริ่ม: ${new Date(promotion.startDate).toLocaleDateString('th-TH')}`: '',
                promotion.endDate? `สิ้นสุด: ${new Date(promotion.endDate).toLocaleDateString('th-TH')}`: ''
            ].filter(Boolean).join(' | ');
            return `
            <div class="item-card">
                <div class="actions">
                    <button class="icon-btn" title="แก้ไข" onclick="admin.editPromotion('${promotion._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn" title="ลบ" onclick="admin.deletePromotion('${promotion._id}', '${promotion.title}')"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div style="display:flex; gap:24px;">
                    ${img}
                    <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                            <h4 style="margin:0; font-size:16px; font-weight:600;">${promotion.title}</h4>
                            <span class="pill" style="background:rgba(0,122,255,.12); color:#0051D0;">${this.getPromotionTypeText(promotion.promotionType)}</span>
                            <span class="pill" style="background:${promotion.isActive? 'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'}; color:${promotion.isActive? '#047857':'#B91C1C'};">${promotion.isActive? 'เปิดใช้งาน':'ปิดใช้งาน'}</span>
                            ${promotion.isFeatured? '<span class="pill" style="background:#FEF3C7; color:#92400E;">แนะนำ</span>':''}
                        </div>
                        ${promotion.subtitle? `<div style=\"font-size:13px; color:var(--text-secondary);\">${promotion.subtitle}</div>`:''}
                        <div style="font-size:12px; color:var(--text-secondary);">${timeInfo}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    renderPromotionsPagination(pagination) {
        const container = document.getElementById('promotions-pagination');
        if (!pagination || pagination.pages <= 1) { container.innerHTML=''; return; }
        let btns='';
        for (let i=1;i<=pagination.pages;i++) {
            btns += `<button onclick=\"admin.goToPromotionPage(${i})\" style=\"border:1px solid var(--border-light); background:${i===pagination.page?'var(--primary-blue)':'#fff'}; color:${i===pagination.page?'#fff':'var(--text-primary)'}; padding:10px 16px; border-radius:14px; font-size:13px; font-weight:500; cursor:pointer; margin:0 4px 8px; box-shadow:0 3px 10px -4px var(--shadow-light);\">${i}</button>`;
        }
        container.innerHTML = `<div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
            <div style="font-size:12px; color:var(--text-secondary);">แสดง ${pagination.page} / ${pagination.pages} หน้า • ทั้งหมด ${pagination.total} รายการ</div>
            <div style="display:flex; flex-wrap:wrap; justify-content:center;">${btns}</div>
        </div>`;
    }

    async savePromotion() {
        try {
            this.showLoading();
            const form = document.getElementById('promotionForm');
            const formData = new FormData(form);
            const promotionId = document.getElementById('promotionId').value;

            // Add default values for required fields
            if (!promotionId) {
                formData.append('title', 'โปรโมชั่น ' + new Date().toLocaleDateString('th-TH'));
                formData.append('isActive', 'true');
                formData.append('order', '0');
                formData.append('promotionType', 'general');
            }

            const url = promotionId ? `/api/frontstore/promotions/${promotionId}` : '/api/frontstore/promotions';
            const method = promotionId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.closePromotionModal();
                this.loadPromotions();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
            }
        } catch (error) {
            console.error('Error saving promotion:', error);
            this.showAlert('เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editPromotion(id) {
        try {
            const response = await fetch(`/api/frontstore/promotions/${id}`);
            const data = await response.json();

            if (data.success) {
                const promotion = data.data;
                document.getElementById('promotionId').value = promotion._id;

                // Show current image if exists
                if (promotion.image) {
                    const preview = document.getElementById('promotionImagePreview');
                    preview.innerHTML = `<img src="${promotion.image}" class="preview-image" alt="Current promotion image">`;
                }

                document.getElementById('promotionModalTitle').textContent = 'แก้ไขโปรโมชั่น';
                document.getElementById('promotionImage').removeAttribute('required');
                this.openPromotionModal();
            }
        } catch (error) {
            console.error('Error loading promotion:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        }
    }

    async deletePromotion(id, title) {
        if (!confirm(`คุณต้องการลบโปรโมชั่น "${title}" หรือไม่?`)) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/frontstore/promotions/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.loadPromotions();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
            }
        } catch (error) {
            console.error('Error deleting promotion:', error);
            this.showAlert('เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadCategoriesForSelect() {
        try {
            // Since we removed the category select, this function is no longer needed
            // but keeping it for compatibility
            console.log('Category select removed - skipping loadCategoriesForSelect');
        } catch (error) {
            console.error('Error loading categories for select:', error);
        }
    }

    openPromotionModal() {
        document.getElementById('promotionModal').classList.add('show');
    }

    closePromotionModal() {
        document.getElementById('promotionModal').classList.remove('show');
        document.getElementById('promotionForm').reset();
        document.getElementById('promotionId').value = '';
        document.getElementById('promotionImagePreview').innerHTML = '';
        document.getElementById('promotionModalTitle').textContent = 'เพิ่มโปรโมชั่นใหม่';
        document.getElementById('promotionImage').setAttribute('required', 'required');
    }

    searchPromotions() {
        this.currentPage = 1;
        this.loadPromotions();
    }

    goToPage(page) {
        this.currentPage = page;
        if (this.currentSection === 'categories') {
            this.loadCategories();
        } else {
            this.loadPromotions();
        }
    }

    goToPromotionPage(page) {
        this.currentPage = page;
        this.loadPromotions();
    }

    getPromotionTypeText(type) {
        const types = {
            'general': 'ทั่วไป',
            'product': 'สินค้า',
            'category': 'หมวดหมู่',
            'bundle': 'แพ็คเกจ'
        };
        return types[type] || type;
    }

    // Content Management Methods
    // Contact Location Management
    async loadContactLocations() {
        try {
            this.showLoading();
            const response = await fetch('/api/frontstore/contact-locations');
            const data = await response.json();

            if (data.success) {
                this.contactLocations = data.data;
                this.renderContactLocations();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลสาขา', 'error');
            }
        } catch (error) {
            console.error('Error loading contact locations:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลสาขา', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderContactLocations() {
        const container = document.getElementById('contact-locations-list');
        if (!this.contactLocations.length) {
            container.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูลสาขา</div>';
            return;
        }

        container.innerHTML = this.contactLocations.map(location => `
            <div class="item-card">
                <div class="actions">
                    <button class="icon-btn" onclick="admin.editContactLocation('${location._id}')" title="แก้ไข">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn" onclick="admin.deleteContactLocation('${location._id}', '${location.name}')" title="ลบ">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <h4 style="margin:0; font-size:16px; font-weight:600; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-store"></i>
                        ${location.name}
                    </h4>
                    <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">
                        <div style="margin-bottom:4px;"><i class="fa-solid fa-location-dot"></i> ${location.address}</div>
                        <div style="margin-bottom:4px;"><i class="fa-solid fa-phone"></i> ${location.phone}</div>
                        ${location.latitude && location.longitude ? `<div><i class="fa-solid fa-map"></i> ${location.latitude}, ${location.longitude}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:8px; margin-top:4px;">
                        <span class="pill" style="background:${location.isActive ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)'}; color:${location.isActive ? '#047857' : '#B91C1C'};">
                            ${location.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                        <span class="pill" style="background:var(--soft-blue);">ลำดับ: ${location.order}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async saveContactLocation() {
        try {
            this.showLoading();
            const form = document.getElementById('contactLocationForm');

            // Get form data as object
            const locationData = {
                name: document.getElementById('locationName').value.trim(),
                phone: document.getElementById('locationPhone').value.trim(),
                address: document.getElementById('locationAddress').value.trim(),
                order: parseInt(document.getElementById('locationOrder').value) || 0,
                isActive: document.getElementById('locationActive').checked
            };

            // Only include latitude and longitude if they have values
            const lat = document.getElementById('locationLat').value.trim();
            const lng = document.getElementById('locationLng').value.trim();
            if (lat) locationData.latitude = parseFloat(lat);
            if (lng) locationData.longitude = parseFloat(lng);

            const locationId = document.getElementById('contactLocationId').value;
            const url = locationId ? `/api/frontstore/contact-locations/${locationId}` : '/api/frontstore/contact-locations';
            const method = locationId ? 'PUT' : 'POST';

            console.log('Sending location data:', locationData);
            console.log('URL:', url, 'Method:', method);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(locationData)
            });

            const data = await response.json();
            console.log('Response:', response.status, data);

            if (data.success) {
                this.showAlert(data.message);
                this.closeContactLocationModal();
                this.loadContactLocations();
            } else {
                console.error('API Error:', data);
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
            }
        } catch (error) {
            console.error('Error saving contact location:', error);
            this.showAlert('เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editContactLocation(id) {
        try {
            const response = await fetch(`/api/frontstore/contact-locations/${id}`);
            const data = await response.json();

            if (data.success) {
                const location = data.data;
                document.getElementById('contactLocationId').value = location._id;
                document.getElementById('locationName').value = location.name;
                document.getElementById('locationPhone').value = location.phone;
                document.getElementById('locationAddress').value = location.address;
                document.getElementById('locationLat').value = location.latitude || '';
                document.getElementById('locationLng').value = location.longitude || '';
                document.getElementById('locationOrder').value = location.order;
                document.getElementById('locationActive').checked = location.isActive;

                document.getElementById('contactLocationModalTitle').textContent = 'แก้ไขข้อมูลสาขา';
                this.openContactLocationModal();
            }
        } catch (error) {
            console.error('Error loading contact location:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลสาขา', 'error');
        }
    }

    async deleteContactLocation(id, name) {
        if (!confirm(`คุณต้องการลบสาขา "${name}" หรือไม่?`)) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/frontstore/contact-locations/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.loadContactLocations();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
            }
        } catch (error) {
            console.error('Error deleting contact location:', error);
            this.showAlert('เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            this.hideLoading();
        }
    }

    openContactLocationModal() {
        document.getElementById('contactLocationModal').classList.add('show');
    }

    closeContactLocationModal() {
        document.getElementById('contactLocationModal').classList.remove('show');
        document.getElementById('contactLocationForm').reset();
        document.getElementById('contactLocationId').value = '';
        document.getElementById('contactLocationModalTitle').textContent = 'เพิ่มสาขาใหม่';
    }

    // Job Management
    async loadJobs() {
        try {
            this.showLoading();
            const response = await fetch('/api/frontstore/jobs');
            const data = await response.json();

            if (data.success) {
                this.jobs = data.data;
                this.renderJobs();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่งงาน', 'error');
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่งงาน', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderJobs() {
        const container = document.getElementById('jobs-list');
        if (!this.jobs.length) {
            container.innerHTML = '<div class="empty-state">ยังไม่มีตำแหน่งงาน</div>';
            return;
        }

        container.innerHTML = this.jobs.map(job => `
            <div class="item-card">
                <div class="actions">
                    <button class="icon-btn" onclick="admin.editJob('${job._id}')" title="แก้ไข">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn" onclick="admin.deleteJob('${job._id}', '${job.title}')" title="ลบ">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <h4 style="margin:0; font-size:16px; font-weight:600; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-briefcase"></i>
                        ${job.title}
                    </h4>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <span class="badge ${job.badgeColor}">${job.branch}</span>
                        <span class="badge light">${job.type}</span>
                    </div>
                    <div style="font-size:13px; color:var(--text-secondary); margin:4px 0;">
                        <div><i class="fa-solid fa-money-bill"></i> ${job.salary}</div>
                        ${job.description ? `<div style="margin-top:4px;">${job.description}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:8px; margin-top:4px;">
                        <span class="pill" style="background:${job.isActive ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)'}; color:${job.isActive ? '#047857' : '#B91C1C'};">
                            ${job.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                        <span class="pill" style="background:var(--soft-blue);">ลำดับ: ${job.order}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async saveJob() {
        try {
            this.showLoading();
            const form = document.getElementById('jobForm');

            // Get form data as object
            const jobData = {
                title: document.getElementById('jobTitle').value,
                branch: document.getElementById('jobBranch').value,
                type: document.getElementById('jobType').value,
                salary: document.getElementById('jobSalary').value,
                description: document.getElementById('jobDescription').value,
                badgeColor: document.getElementById('jobBadgeColor').value,
                order: parseInt(document.getElementById('jobOrder').value) || 0,
                isActive: document.getElementById('jobActive').checked
            };

            const jobId = document.getElementById('jobId').value;
            const url = jobId ? `/api/frontstore/jobs/${jobId}` : '/api/frontstore/jobs';
            const method = jobId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jobData)
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.closeJobModal();
                this.loadJobs();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
            }
        } catch (error) {
            console.error('Error saving job:', error);
            this.showAlert('เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editJob(id) {
        try {
            const response = await fetch(`/api/frontstore/jobs/${id}`);
            const data = await response.json();

            if (data.success) {
                const job = data.data;
                document.getElementById('jobId').value = job._id;
                document.getElementById('jobTitle').value = job.title;
                document.getElementById('jobBranch').value = job.branch;
                document.getElementById('jobType').value = job.type;
                document.getElementById('jobSalary').value = job.salary;
                document.getElementById('jobDescription').value = job.description || '';
                document.getElementById('jobBadgeColor').value = job.badgeColor;
                document.getElementById('jobOrder').value = job.order;
                document.getElementById('jobActive').checked = job.isActive;

                document.getElementById('jobModalTitle').textContent = 'แก้ไขตำแหน่งงาน';
                this.openJobModal();
            }
        } catch (error) {
            console.error('Error loading job:', error);
            this.showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่งงาน', 'error');
        }
    }

    async deleteJob(id, title) {
        if (!confirm(`คุณต้องการลบตำแหน่งงาน "${title}" หรือไม่?`)) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/frontstore/jobs/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(data.message);
                this.loadJobs();
            } else {
                this.showAlert(data.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            this.showAlert('เกิดข้อผิดพลาดในการลบ', 'error');
        } finally {
            this.hideLoading();
        }
    }

    openJobModal() {
        document.getElementById('jobModal').classList.add('show');
    }

    closeJobModal() {
        document.getElementById('jobModal').classList.remove('show');
        document.getElementById('jobForm').reset();
        document.getElementById('jobId').value = '';
        document.getElementById('jobModalTitle').textContent = 'เพิ่มตำแหน่งงานใหม่';
    }

    logout() {
        if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
            window.location.href = '/logout';
        }
    }
}

// Global variable for admin instance
let admin = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing FrontStore Admin...');
    admin = new FrontStoreAdmin();
    console.log('FrontStore Admin initialized successfully');
});

// Global functions for HTML onclick events
function showSection(section, element) {
    if (admin) {
        admin.showSection(section, element);
    } else {
        console.error('Admin not initialized yet');
    }
}

function openCategoryModal() {
    if (admin) {
        admin.openCategoryModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

function closeCategoryModal() {
    if (admin) {
        admin.closeCategoryModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

function openPromotionModal() {
    if (admin) {
        admin.openPromotionModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

function closePromotionModal() {
    if (admin) {
        admin.closePromotionModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

function searchCategories() {
    if (admin) {
        admin.searchCategories();
    } else {
        console.error('Admin not initialized yet');
    }
}

function searchPromotions() {
    if (admin) {
        admin.searchPromotions();
    } else {
        console.error('Admin not initialized yet');
    }
}

function logout() {
    if (admin) {
        admin.logout();
    } else {
        console.error('Admin not initialized yet');
    }
}

// Video Management Functions
function openVideoModal() {
    const modal = document.getElementById('videoModal');
    modal.classList.add('show');
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    modal.classList.remove('show');
}

// Product Management Functions
function openProductModal() {
    const modal = document.getElementById('productModal');
    document.getElementById('productModalTitle').textContent = 'เพิ่มสินค้าใหม่';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImagePreview').innerHTML = '';
    modal.classList.add('show');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('show');
}

function refreshProducts() {
    // Reload current tab's products
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        const category = activeTab.getAttribute('onclick').match(/'([^']+)'/)[1];
        loadProductsByCategory(category);
    }
}

function switchProductTab(category, element) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    // Hide all product sections
    document.querySelectorAll('.product-category-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected category section
    document.getElementById(category + '-products').style.display = 'block';

    // Load products for this category
    loadProductsByCategory(category);
}

function loadProductsByCategory(category) {
    // Add cache busting parameter
    const timestamp = new Date().getTime();
    const url = `/api/frontstore/products?category=${category}&_t=${timestamp}`;

    // Load products from API instead of using mock data
    fetch(url, {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderProductsForCategory(category, data.data);
            } else {
                console.error('Failed to load products:', data.message);
                renderProductsForCategory(category, []);
                showErrorMessage(`ไม่สามารถโหลดสินค้าได้: ${data.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`);
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
            renderProductsForCategory(category, []);
            showErrorMessage(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`);
        });
}

function renderProductsForCategory(category, products) {
    const container = document.getElementById(category + '-list');

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">ยังไม่มีสินค้าในหมวดหมู่นี้</div>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="item-card">
            <div class="actions">
                <button class="icon-btn" onclick="editProduct('${product._id || product.id}', '${category}')" title="แก้ไข">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="icon-btn" onclick="deleteProduct('${product._id || product.id}', '${category}')" title="ลบ">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <img src="${product.image}" alt="Product Image" style="width:100%; height:180px; object-fit:cover; border-radius:12px; margin-bottom:12px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; gap:8px; margin-top:4px;">
                    ${product.isActive !== false ? '<span class="pill" style="background:rgba(16,185,129,.12); color:#047857;">เปิดใช้งาน</span>' : '<span class="pill" style="background:rgba(239,68,68,.12); color:#B91C1C;">ปิดใช้งาน</span>'}
                    ${product.featured || product.isFeatured ? '<span class="pill" style="background:#FEF3C7; color:#92400E;">สินค้าเด่น</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function editProduct(id, category) {
    // Sample edit function - replace with actual data loading
    const modal = document.getElementById('productModal');
    document.getElementById('productModalTitle').textContent = 'แก้ไขสินค้า';
    document.getElementById('productId').value = id;
    document.getElementById('productCategory').value = category;

    // Load product data here...

    modal.classList.add('show');
}

function deleteProduct(id, category) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) {
        // Show loading indicator
        const container = document.getElementById(category + '-list');
        const originalContent = container.innerHTML;
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">กำลังลบสินค้า...</div>';

        // Call API to delete product
        fetch(`/api/frontstore/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Cache-Control': 'no-cache'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (admin) {
                    admin.showAlert('ลบสินค้าสำเร็จ', 'success');
                } else {
                    alert('ลบสินค้าสำเร็จ');
                }

                // Force reload with a slight delay to ensure database is updated
                setTimeout(() => {
                    loadProductsByCategory(category);
                }, 500);
            } else {
                // Restore original content on error
                container.innerHTML = originalContent;
                if (admin) {
                    admin.showAlert(data.message || 'เกิดข้อผิดพลาดในการลบสินค้า', 'error');
                } else {
                    alert(data.message || 'เกิดข้อผิดพลาดในการลบสินค้า');
                }
            }
        })
        .catch(error => {
            console.error('Error deleting product:', error);
            // Restore original content on error
            container.innerHTML = originalContent;
            if (admin) {
                admin.showAlert('เกิดข้อผิดพลาดในการลบสินค้า', 'error');
            } else {
                alert('เกิดข้อผิดพลาดในการลบสินค้า');
            }
        });
    }
}

// Form submission handlers
document.addEventListener('DOMContentLoaded', function() {
    // Load iPhone products by default
    setTimeout(() => {
        loadProductsByCategory('iphone');
    }, 100);

    // Video form submission
    const videoForm = document.getElementById('videoForm');
    if (videoForm) {
        videoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);

            try {
                const response = await fetch('/api/frontstore/video', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    alert('บันทึกข้อมูลวิดีโอสำเร็จ');
                    closeVideoModal();
                    // Reload video in frontend if needed
                    window.location.reload();
                } else {
                    alert('เกิดข้อผิดพลาด: ' + data.message);
                }
            } catch (error) {
                console.error('Error saving video:', error);
                alert('เกิดข้อผิดพลาดในการบันทึก');
            }
        });
    }

    // Contact location form submission
    const contactLocationForm = document.getElementById('contactLocationForm');
    if (contactLocationForm) {
        contactLocationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (admin) {
                admin.saveContactLocation();
            }
        });
    }

    // Job form submission
    const jobForm = document.getElementById('jobForm');
    if (jobForm) {
        jobForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (admin) {
                admin.saveJob();
            }
        });
    }

    // Product form submission
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);

            const productId = document.getElementById('productId').value;
            const url = productId ? `/api/frontstore/products/${productId}` : '/api/frontstore/products';
            const method = productId ? 'PUT' : 'POST';

            // Get button and store original text before try block
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                // Show loading state
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
                submitBtn.disabled = true;

                const response = await fetch(url, {
                    method: method,
                    body: formData
                });

                if (!response.ok) {
                    if (response.status === 413) {
                        throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 100MB)');
                    } else if (response.status === 502) {
                        throw new Error('เซิร์ฟเวอร์ไม่สามารถเข้าถึงได้ กรุณาลองใหม่อีกครั้ง');
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }

                const data = await response.json();
                if (data.success) {
                    alert(productId ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ');
                    closeProductModal();

                    // Reload current category
                    const activeTab = document.querySelector('.tab-btn.active');
                    if (activeTab) {
                        const category = activeTab.getAttribute('onclick').match(/'([^']+)'/)[1];
                        loadProductsByCategory(category);
                    }
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
                }
            } catch (error) {
                console.error('Error saving product:', error);
                showErrorMessage('ไม่สามารถบันทึกสินค้าได้: ' + error.message);
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // File preview handlers
    const productImage = document.getElementById('productImage');
    if (productImage) {
        productImage.addEventListener('change', function() {
            // Validate file before preview
            if (validateFileSize(this)) {
                previewImage(this, 'productImagePreview');
            }
        });
    }
});

// File size validation function
function validateFileSize(input) {
    if (!input.files || !input.files[0]) return false;

    const file = input.files[0];
    const maxSizeMB = file.type.startsWith('video/') ? 100 : 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const fileType = file.type.startsWith('video/') ? 'วิดีโอ' : 'รูปภาพ';

        showErrorMessage(`${fileType}ใหญ่เกินไป (${fileSizeMB} MB) กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน ${maxSizeMB} MB`);
        input.value = ''; // Clear the input
        return false;
    }

    return true;
}

// Helper function for image and video preview
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    preview.innerHTML = '';

    if (input.files && input.files[0]) {
        const file = input.files[0];

        // File size validation
        const maxSizeMB = file.type.startsWith('video/') ? 100 : 5; // 100MB for video, 5MB for images
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

        if (file.size > maxSizeBytes) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                padding: 12px;
                background: linear-gradient(145deg, #FEF2F2, #FED7D7);
                border: 1px solid #FECACA;
                border-radius: 12px;
                color: #DC2626;
                font-size: 14px;
                line-height: 1.5;
                margin-top: 8px;
            `;

            if (file.type.startsWith('video/')) {
                errorDiv.innerHTML = `
                    <strong>วิดีโอใหญ่เกินไป (${fileSizeMB} MB)</strong><br>
                    กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน ${maxSizeMB} MB<br><br>
                    <strong>คำแนะนำสำหรับวิดีโอ:</strong><br>
                    • ลดความละเอียดหรือคุณภาพวิดีโอ<br>
                    • ตัดความยาววิดีโอให้สั้นลง<br>
                    • ใช้โปรแกรมบีบอัดวิดีโอ
                `;
            } else {
                errorDiv.innerHTML = `
                    <strong>รูปภาพใหญ่เกินไป (${fileSizeMB} MB)</strong><br>
                    กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน ${maxSizeMB} MB
                `;
            }

            preview.appendChild(errorDiv);
            input.value = ''; // Clear the input
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            if (file.type.startsWith('image/')) {
                // Handle image preview
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '200px';
                img.style.maxHeight = '200px';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '12px';
                img.style.border = '1px solid var(--border-light)';
                preview.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                // Handle video preview
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                video.style.maxWidth = '300px';
                video.style.maxHeight = '200px';
                video.style.borderRadius = '12px';
                video.style.border = '1px solid var(--border-light)';
                preview.appendChild(video);

                // Add file info with success style
                const info = document.createElement('div');
                info.style.cssText = `
                    margin-top: 8px;
                    padding: 8px 12px;
                    background: linear-gradient(145deg, #F0FDF4, #DCFCE7);
                    border: 1px solid #BBF7D0;
                    border-radius: 8px;
                    font-size: 12px;
                    color: #16A34A;
                `;
                info.innerHTML = `
                    <strong>✅ วิดีโอพร้อมอัปโหลด</strong><br>
                    ไฟล์: ${file.name}<br>
                    ขนาด: ${fileSizeMB} MB
                `;
                preview.appendChild(info);
            }
        };
        reader.readAsDataURL(file);
    }
}

// Content Management Global Functions
function switchContentTab(tab, element) {
    // Update active tab
    document.querySelectorAll('.product-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    // Hide all content sections
    document.querySelectorAll('.product-category-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected tab content
    document.getElementById(tab + '-content').style.display = 'block';

    // Load data for the selected tab
    if (admin) {
        admin.currentContentTab = tab;
        if (tab === 'contact') {
            admin.loadContactLocations();
        } else if (tab === 'jobs') {
            admin.loadJobs();
        }
    }
}

function openContactLocationModal() {
    if (admin) {
        admin.openContactLocationModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

function closeContactLocationModal() {
    if (admin) {
        admin.closeContactLocationModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

function openJobModal() {
    if (admin) {
        admin.openJobModal();
    } else {
        console.error('Admin not initialized yet');
    }
}

// Utility function to show error messages
function showErrorMessage(message) {
    // Create a temporary toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4757;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
    `;
    toast.textContent = message;

    // Add to document
    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Add CSS animations for toast
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function closeJobModal() {
    if (admin) {
        admin.closeJobModal();
    } else {
        console.error('Admin not initialized yet');
    }
}