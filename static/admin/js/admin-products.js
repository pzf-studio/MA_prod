// Админ-панель: управление товарами (с поддержкой availability и is_price_on_request)
class AdminProductsManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.products = [];
        this.sections = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.authToken = localStorage.getItem('admin_token');
        this.currentProductForCopy = null;
        this.colorPicker = null;
        this.copyImages = [];
        this.init();
    }
    async init() {
        await this.checkAuth();
        await this.loadProducts();
        await this.loadSections();
        this.initEventListeners();
        this.initColorModal();
        this.attachFilters();
    }
    async checkAuth() {
        if (!this.authToken) { window.location.href = '/admin'; return; }
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/verify`, { headers: { 'Authorization': `Bearer ${this.authToken}` } });
            if (!response.ok) window.location.href = '/admin';
        } catch (error) { window.location.href = '/admin'; }
    }
    async loadProducts() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/products`, { headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' } });
            const data = await response.json();
            if (data.success) { this.products = data.products; this.renderProducts(); this.updateProductsBadge(); }
            else throw new Error(data.error);
        } catch (error) { console.error('Ошибка загрузки товаров:', error); this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }
    async loadSections() {
        try {
            const response = await fetch(`${this.API_BASE}/api/sections`);
            const data = await response.json();
            if (data.success) { this.sections = data.sections; this.populateSectionSelect(); }
        } catch (error) { console.error('Ошибка загрузки разделов:', error); }
    }
    getFilteredProducts() {
        let filtered = [...this.products];
        const search = document.getElementById('productSearch')?.value.toLowerCase() || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const sort = document.getElementById('sortBy')?.value || 'newest';
        if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || (p.code && p.code.toLowerCase().includes(search)));
        if (category) filtered = filtered.filter(p => p.category === category);
        if (status) filtered = filtered.filter(p => p.status === status);
        switch(sort) {
            case 'price_asc': filtered.sort((a,b) => a.price - b.price); break;
            case 'price_desc': filtered.sort((a,b) => b.price - a.price); break;
            case 'name_asc': filtered.sort((a,b) => a.name.localeCompare(b.name)); break;
            case 'name_desc': filtered.sort((a,b) => b.name.localeCompare(a.name)); break;
            case 'oldest': filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)); break;
            default: filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return filtered;
    }
    renderProducts() {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;
        const filtered = this.getFilteredProducts();
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage > totalPages) this.currentPage = totalPages || 1;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const productsToShow = filtered.slice(startIndex, startIndex + this.itemsPerPage);
        if (productsToShow.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px;"><i class="fas fa-box-open" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i><h3>Товары не найдены</h3><p>Нет добавленных товаров. Добавьте первый товар!</p></td></tr>`;
            this.renderPagination(0);
            return;
        }
        tableBody.innerHTML = '';
        productsToShow.forEach(product => {
            const row = document.createElement('tr');
            const isActive = product.status === 'active';
            const statusToggle = `<div class="status-toggle ${isActive ? 'active' : ''}" onclick="window.adminProducts.toggleStatus(${product.id})"></div>`;
            const imageUrl = product.images?.[0] || '';
            const imageCell = `<td class="product-image-cell">${imageUrl ? `<img src="${imageUrl}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover;">` : '<div class="no-image"><i class="fas fa-box"></i></div>'}</td>`;
            let badgeHTML = '';
            if (product.badge) {
                const badgeClass = product.badge.toLowerCase().includes('новинка') ? 'badge-new' : (product.badge.toLowerCase().includes('хит') ? 'badge-hit' : (product.badge.toLowerCase().includes('акция') ? 'badge-sale' : ''));
                badgeHTML = `<span class="badge-tag ${badgeClass}">${product.badge}</span>`;
            }
            const date = new Date(product.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU');
            const priceFormatted = window.formatPrice(product.price);
            
            // Исправление: гарантируем, что color_variants – массив
            let colorVariants = product.color_variants;
            if (!Array.isArray(colorVariants)) {
                try { colorVariants = JSON.parse(colorVariants); } catch(e) { colorVariants = []; }
                if (!Array.isArray(colorVariants)) colorVariants = [];
            }
            const copyCount = colorVariants.filter(v => !v.is_original).length;
            const colorCountHTML = copyCount > 0 ? `<span class="color-count" title="${copyCount} цветовых копий" style="background: #3498db; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">+${copyCount}</span>` : '';
            
            row.innerHTML = `
                <td>${product.id}</td>
                ${imageCell}
                <td><strong>${this.escapeHtml(product.name)}</strong><br><small class="text-muted">${this.escapeHtml(product.description?.substring(0, 100))}...</small></td>
                <td>${product.category || '-'}</td>
                <td>${priceFormatted}</td>
                <td>${statusToggle}</td>
                <td>${badgeHTML}</td>
                <td>${formattedDate}</td>
                <td>${colorCountHTML}</td>
                <td><div class="action-buttons">
                    <button class="action-btn view" onclick="window.adminProducts.viewProduct(${product.id})"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="window.adminProducts.editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn copy" onclick="window.adminProducts.openColorCopyModal(${product.id})" title="Создать цветовую копию"><i class="fas fa-palette"></i></button>
                    <button class="action-btn delete" onclick="window.adminProducts.confirmDelete(${product.id})"><i class="fas fa-trash"></i></button>
                </div></td>
            `;
            tableBody.appendChild(row);
        });
        this.renderPagination(filtered.length);
    }
    renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        if (totalPages <= 1) { pagination.innerHTML = ''; return; }
        let html = `<button class="page-item ${this.currentPage === 1 ? 'disabled' : ''}" onclick="window.adminProducts.changePage(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button class="page-item ${i === this.currentPage ? 'active' : ''}" onclick="window.adminProducts.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="page-item disabled">...</span>';
            }
        }
        html += `<button class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}" onclick="window.adminProducts.changePage(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        pagination.innerHTML = html;
    }
    changePage(page) {
        const filtered = this.getFilteredProducts();
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderProducts();
    }
    attachFilters() {
        const search = document.getElementById('productSearch');
        const category = document.getElementById('categoryFilter');
        const status = document.getElementById('statusFilter');
        const sort = document.getElementById('sortBy');
        if (search) search.addEventListener('input', () => { this.currentPage = 1; this.renderProducts(); });
        if (category) category.addEventListener('change', () => { this.currentPage = 1; this.renderProducts(); });
        if (status) status.addEventListener('change', () => { this.currentPage = 1; this.renderProducts(); });
        if (sort) sort.addEventListener('change', () => { this.currentPage = 1; this.renderProducts(); });
    }
    populateSectionSelect() {
        const sectionSelect = document.getElementById('productSection');
        if (!sectionSelect) return;
        while (sectionSelect.options.length > 1) sectionSelect.remove(1);
        this.sections.filter(s => s.active).forEach(section => {
            const option = document.createElement('option');
            option.value = section.code;
            option.textContent = section.name;
            sectionSelect.appendChild(option);
        });
    }
    async toggleStatus(productId) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) return;
            const newStatus = product.status === 'active' ? 'inactive' : 'active';
            const response = await fetch(`${this.API_BASE}/api/admin/products/${productId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (data.success) {
                product.status = newStatus;
                this.renderProducts();
                this.showNotification(`Товар "${product.name}" ${newStatus === 'active' ? 'активирован' : 'деактивирован'}`, 'success');
            } else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }
    async deleteProduct(productId) {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await response.json();
            if (data.success) {
                this.products = this.products.filter(p => p.id !== productId);
                this.renderProducts();
                this.updateProductsBadge();
                this.showNotification('Товар успешно удален', 'success');
            } else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }
    updateProductsBadge() {
        const badge = document.getElementById('productsBadge');
        if (badge) badge.textContent = this.products.length;
    }
    initEventListeners() {
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openProductModal());
        const productForm = document.getElementById('productForm');
        if (productForm) productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());
        const deleteCancel = document.getElementById('deleteCancel');
        const deleteConfirm = document.getElementById('deleteConfirm');
        if (deleteCancel) deleteCancel.addEventListener('click', () => this.closeDeleteModal());
        if (deleteConfirm) deleteConfirm.addEventListener('click', () => this.confirmDeleteAction());
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageUpload = document.getElementById('imageUpload');
        if (imageUploadArea && imageUpload) {
            imageUploadArea.addEventListener('click', () => imageUpload.click());
            imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
        const availabilitySelect = document.getElementById('productCategory');
        if (availabilitySelect) {
            availabilitySelect.addEventListener('change', (e) => { this.togglePriceOnRequestCheckbox(e.target.value === '1'); });
        }
    }
    togglePriceOnRequestCheckbox(enable) {
        const checkbox = document.getElementById('priceOnRequest');
        if (checkbox) {
            checkbox.disabled = !enable;
            if (!enable) checkbox.checked = false;
        }
    }
    initColorModal() {
        const colorModal = document.getElementById('colorCopyModal');
        const closeBtn = document.getElementById('colorModalClose');
        const cancelBtn = document.getElementById('colorModalCancel');
        const createBtn = document.getElementById('createColorCopyBtn');
        const copyImageUploadArea = document.getElementById('copyImageUploadArea');
        const copyImageUpload = document.getElementById('copyImageUpload');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeColorModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeColorModal());
        if (createBtn) createBtn.addEventListener('click', () => this.createColorCopy());
        if (copyImageUploadArea && copyImageUpload) {
            copyImageUploadArea.addEventListener('click', () => copyImageUpload.click());
            copyImageUpload.addEventListener('change', (e) => this.handleCopyImageUpload(e));
        }
        setTimeout(() => this.initializeColorPicker(), 100);
    }
    initializeColorPicker() {
        const colorPickerContainer = document.getElementById('adminColorPicker');
        if (!colorPickerContainer) return;
        if (typeof AdminColorPicker === 'undefined') { this.createFallbackColorPicker(); return; }
        try {
            this.colorPicker = new AdminColorPicker('adminColorPicker', {
                onColorSelect: (color) => {
                    const colorNameInput = document.getElementById('colorNameInput');
                    if (colorNameInput && !colorNameInput.value) colorNameInput.value = color.name;
                }
            });
            this.loadColorPalette();
        } catch (error) { this.createFallbackColorPicker(); }
    }
    createFallbackColorPicker() {
        const container = document.getElementById('adminColorPicker');
        if (!container) return;
        container.innerHTML = `<div class="color-picker-section" style="padding:20px;background:#f8f9fa;border-radius:8px;"><h4 style="margin-bottom:15px;">Выберите цвет для копии</h4>
            <div style="margin-bottom:20px;"><label style="display:block;margin-bottom:8px;font-weight:600;">Название цвета *</label><input type="text" id="colorNameInput" placeholder="Например: Черный матовый" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;"></div>
            <div style="margin-bottom:20px;"><label style="display:block;margin-bottom:8px;font-weight:600;">Цвет (HEX) *</label><input type="color" id="colorHexInput" value="#2C2C2C" style="width:60px;height:40px;vertical-align:middle;"><input type="text" id="colorHexText" value="#2C2C2C" style="margin-left:10px;padding:8px;width:100px;border:1px solid #ddd;border-radius:5px;"></div>
            <div style="margin-bottom:15px;"><label style="display:block;margin-bottom:8px;font-weight:600;">Быстрый выбор:</label><div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div class="quick-color" style="width:40px;height:40px;background:#2C2C2C;border-radius:50%;cursor:pointer;border:3px solid transparent;" title="Черный матовый" onclick="document.getElementById('colorHexInput').value='#2C2C2C';document.getElementById('colorHexText').value='#2C2C2C';document.getElementById('colorNameInput').value='Черный матовый';this.parentNode.querySelectorAll('.quick-color').forEach(el=>el.style.border='3px solid transparent');this.style.border='3px solid #333';"></div>
            <div class="quick-color" style="width:40px;height:40px;background:#FFFFFF;border-radius:50%;cursor:pointer;border:3px solid transparent;border:1px solid #ddd;" title="Белый глянцевый" onclick="document.getElementById('colorHexInput').value='#FFFFFF';document.getElementById('colorHexText').value='#FFFFFF';document.getElementById('colorNameInput').value='Белый глянцевый';this.parentNode.querySelectorAll('.quick-color').forEach(el=>el.style.border='3px solid transparent');this.style.border='3px solid #333';"></div>
            <div class="quick-color" style="width:40px;height:40px;background:#7D7D7D;border-radius:50%;cursor:pointer;border:3px solid transparent;" title="Серый металлик" onclick="document.getElementById('colorHexInput').value='#7D7D7D';document.getElementById('colorHexText').value='#7D7D7D';document.getElementById('colorNameInput').value='Серый металлик';this.parentNode.querySelectorAll('.quick-color').forEach(el=>el.style.border='3px solid transparent');this.style.border='3px solid #333';"></div>
            <div class="quick-color" style="width:40px;height:40px;background:#8B4513;border-radius:50%;cursor:pointer;border:3px solid transparent;" title="Коричневый" onclick="document.getElementById('colorHexInput').value='#8B4513';document.getElementById('colorHexText').value='#8B4513';document.getElementById('colorNameInput').value='Коричневый';this.parentNode.querySelectorAll('.quick-color').forEach(el=>el.style.border='3px solid transparent');this.style.border='3px solid #333';"></div>
            <div class="quick-color" style="width:40px;height:40px;background:#F5DEB3;border-radius:50%;cursor:pointer;border:3px solid transparent;" title="Бежевый" onclick="document.getElementById('colorHexInput').value='#F5DEB3';document.getElementById('colorHexText').value='#F5DEB3';document.getElementById('colorNameInput').value='Бежевый';this.parentNode.querySelectorAll('.quick-color').forEach(el=>el.style.border='3px solid transparent');this.style.border='3px solid #333';"></div>
            </div></div><small style="color:#666;">* - обязательные поля</small></div>`;
        const colorHexInput = document.getElementById('colorHexInput');
        const colorHexText = document.getElementById('colorHexText');
        if (colorHexInput && colorHexText) {
            colorHexInput.addEventListener('input', (e) => { colorHexText.value = e.target.value; });
            colorHexText.addEventListener('input', (e) => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) colorHexInput.value = e.target.value; });
        }
        const firstColor = container.querySelector('.quick-color');
        if (firstColor) firstColor.click();
    }
    async loadColorPalette() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/colors/palette`);
            const data = await response.json();
            if (data.success && this.colorPicker && data.palette) this.colorPicker.setPalette(data.palette);
        } catch (error) { console.error('Ошибка загрузки палитры:', error); }
    }
    async openColorCopyModal(productId) {
        this.currentProductForCopy = productId;
        const product = this.products.find(p => p.id === productId);
        if (!product) { this.showNotification('Товар не найден', 'error'); return; }
        document.getElementById('baseProductName').textContent = product.name;
        document.getElementById('baseProductCode').textContent = product.code || `ID${product.id}`;
        const baseCode = product.code || `ID${product.id}`;
        
        // Исправление: гарантируем массив color_variants
        let colorVariants = product.color_variants;
        if (!Array.isArray(colorVariants)) {
            try { colorVariants = JSON.parse(colorVariants); } catch(e) { colorVariants = []; }
            if (!Array.isArray(colorVariants)) colorVariants = [];
        }
        const existingCopies = colorVariants.filter(v => !v.is_original);
        const newIndex = existingCopies.length + 1;
        document.getElementById('copyProductCode').textContent = `${baseCode}/${newIndex}`;
        document.getElementById('copyPrice').value = product.price || '';
        document.getElementById('copyStock').value = 0;
        document.getElementById('copyImagePreview').innerHTML = '';
        this.copyImages = [];
        const createBtn = document.getElementById('createColorCopyBtn');
        if (existingCopies.length >= 4) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-ban"></i> Достигнут лимит (макс. 4 копии)';
            this.showNotification('Для этого товара уже создано максимальное количество цветовых копий (4)', 'warning');
        } else {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="fas fa-copy"></i> Создать цветовую копию';
        }
        document.getElementById('colorCopyModal').classList.add('active');
    }
    closeColorModal() {
        document.getElementById('colorCopyModal').classList.remove('active');
        this.currentProductForCopy = null;
        this.copyImages = [];
    }
    async handleCopyImageUpload(e) {
        const files = Array.from(e.target.files);
        for (const file of files) {
            if (!file.type.startsWith('image/')) { this.showNotification('Пожалуйста, загружайте только изображения', 'error'); continue; }
            if (file.size > 5 * 1024 * 1024) { this.showNotification(`Файл ${file.name} слишком большой (максимум 5MB)`, 'error'); continue; }
            const preview = document.getElementById('copyImagePreview');
            const loader = document.createElement('div');
            loader.className = 'preview-item';
            loader.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f8f9fa;"><i class="fas fa-spinner fa-spin"></i></div>`;
            preview.appendChild(loader);
            const result = await this.uploadImage(file);
            loader.remove();
            if (result.success) { this.addCopyImagePreview(result); this.copyImages.push(result.url); }
            else this.showNotification(`Ошибка загрузки: ${result.error}`, 'error');
        }
        e.target.value = '';
    }
    addCopyImagePreview(fileInfo) {
        const preview = document.getElementById('copyImagePreview');
        if (!preview) return;
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `<img src="${fileInfo.url}" alt="${fileInfo.original_name}" style="width:100%;height:100%;object-fit:cover;"><button class="preview-remove" onclick="this.closest('.preview-item').remove(); window.adminProducts.removeCopyImage('${fileInfo.url}')"><i class="fas fa-times"></i></button>`;
        preview.appendChild(previewItem);
    }
    removeCopyImage(imageUrl) { this.copyImages = this.copyImages.filter(url => url !== imageUrl); }
    async createColorCopy() {
        if (!this.currentProductForCopy) { this.showNotification('Ошибка: товар не выбран', 'error'); return; }
        const product = this.products.find(p => p.id === this.currentProductForCopy);
        if (!product) { this.showNotification('Товар не найден', 'error'); return; }
        let colorData = {};
        if (this.colorPicker && typeof this.colorPicker.getSelectedColor === 'function') colorData = this.colorPicker.getSelectedColor();
        else {
            const colorNameInput = document.getElementById('colorNameInput');
            const colorHexInput = document.getElementById('colorHexInput');
            const colorHexText = document.getElementById('colorHexText');
            if (!colorNameInput || !colorNameInput.value.trim()) { this.showNotification('Введите название цвета', 'error'); return; }
            const hexValue = colorHexText ? colorHexText.value : (colorHexInput ? colorHexInput.value : '#2C2C2C');
            colorData = { name: colorNameInput.value.trim(), hex: hexValue };
        }
        if (!colorData.name || !colorData.hex) { this.showNotification('Заполните информацию о цвете', 'error'); return; }
        const priceInput = document.getElementById('copyPrice');
        const stockInput = document.getElementById('copyStock');
        const variantData = {
            color_name: colorData.name,
            color_hex: colorData.hex,
            price: priceInput.value ? parseInt(priceInput.value) : product.price,
            stock: parseInt(stockInput.value) || 0,
            images: this.copyImages.length > 0 ? this.copyImages : (product.images || [])
        };
        if (isNaN(variantData.price) || variantData.price < 0) { this.showNotification('Введите корректную цену', 'error'); return; }
        const createBtn = document.getElementById('createColorCopyBtn');
        const originalText = createBtn.innerHTML;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
        createBtn.disabled = true;
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/products/${this.currentProductForCopy}/color-variant`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(variantData)
            });
            const data = await response.json();
            if (data.success) {
                this.showNotification(`Цветовая копия создана: ${data.variant.variant_id}`, 'success');
                this.closeColorModal();
                await this.loadProducts();
                this.highlightCreatedCopy(data.variant.variant_id);
            } else throw new Error(data.error || 'Неизвестная ошибка сервера');
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
        finally { createBtn.innerHTML = originalText; createBtn.disabled = false; }
    }
    highlightCreatedCopy(variantId) { console.log(`Создана цветовая копия: ${variantId}`); this.showNotification(`Копия ${variantId} успешно создана`, 'success'); }
    openProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');
        if (!modal || !modalTitle || !form) return;
        form.reset();
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) imagePreview.innerHTML = '';
        document.getElementById('productId').value = '';
        document.getElementById('productImages').value = '[]';
        document.getElementById('priceOnRequest').checked = false;
        document.getElementById('priceOnRequest').disabled = true;
        document.getElementById('productCategory').value = '0';
        if (productId) { modalTitle.textContent = 'Редактировать товар'; this.loadProductData(productId); }
        else modalTitle.textContent = 'Добавить новый товар';
        modal.classList.add('active');
    }
    loadProductData(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCode').value = product.code || '';
        document.getElementById('productCategory').value = product.availability !== undefined ? product.availability : 0;
        document.getElementById('productSection').value = product.section || '';
        document.getElementById('productPrice').value = product.price || 0;
        document.getElementById('productOldPrice').value = product.old_price || '';
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('productRecommended').value = product.recommended ? 'true' : 'false';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productSpecifications').value = product.specifications || '';
        document.getElementById('productStatus').value = product.status || 'active';
        document.getElementById('productStock').value = product.stock || 10;
        const priceOnRequestCheckbox = document.getElementById('priceOnRequest');
        if (priceOnRequestCheckbox) priceOnRequestCheckbox.checked = product.is_price_on_request === 1;
        this.togglePriceOnRequestCheckbox(product.availability === 1);

        const priceFromCheckbox = document.getElementById('priceFrom');
            if (priceFromCheckbox) {
                priceFromCheckbox.checked = product.is_price_from === true;
            }
        const images = product.images || [];
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview && images.length > 0) {
            imagePreview.innerHTML = '';
            images.forEach(image => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `<img src="${image}" alt="Превью"><button class="preview-remove" onclick="this.closest('.preview-item').remove(); window.adminProducts.updateImagesField()"><i class="fas fa-times"></i></button>`;
                imagePreview.appendChild(previewItem);
            });
            document.getElementById('productImages').value = JSON.stringify(images);
        }
    }
    async handleProductSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const availability = parseInt(document.getElementById('productCategory').value) === 1 ? 1 : 0;
        const is_price_on_request = document.getElementById('priceOnRequest').checked ? 1 : 0;
        const is_price_from = document.getElementById('priceFrom').checked ? true : false;   // НОВОЕ

        const productData = {
            name: formData.get('productName'),
            code: formData.get('productCode'),
            category: formData.get('productCategory'),
            section: formData.get('productSection'),
            price: parseInt(formData.get('productPrice')) || 0,
            old_price: formData.get('productOldPrice') ? parseInt(formData.get('productOldPrice')) : null,
            badge: formData.get('productBadge') || null,
            recommended: formData.get('productRecommended') === 'true',
            description: formData.get('productDescription'),
            specifications: formData.get('productSpecifications'),
            status: formData.get('productStatus'),
            stock: parseInt(formData.get('productStock')) || 0,
            images: JSON.parse(formData.get('productImages') || '[]'),
            availability: availability,
            is_price_on_request: is_price_on_request,
            is_price_from: is_price_from   // НОВОЕ
        };
        const productId = formData.get('productId');
        try {
            const url = productId ? `${this.API_BASE}/api/admin/products/${productId}` : `${this.API_BASE}/api/admin/products`;
            const method = productId ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method, headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            const data = await response.json();
            if (data.success) {
                await this.loadProducts();
                this.closeModal();
                this.showNotification(productId ? 'Товар обновлен' : 'Товар добавлен', 'success');
            } else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }
    async handleImageUpload(e) {
        const files = Array.from(e.target.files);
        for (const file of files) {
            if (!file.type.startsWith('image/')) { this.showNotification('Пожалуйста, загружайте только изображения', 'error'); continue; }
            if (file.size > 5 * 1024 * 1024) { this.showNotification(`Файл ${file.name} слишком большой (максимум 5MB)`, 'error'); continue; }
            const result = await this.uploadImage(file);
            if (result.success) this.addImagePreview(result);
            else this.showNotification(`Ошибка загрузки: ${result.error}`, 'error');
        }
        e.target.value = '';
    }
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: { 'X-Admin-Request': 'true', 'Authorization': `Bearer ${this.authToken}` }
            });
            return await response.json();
        } catch (error) { return { success: false, error: error.message }; }
    }
    addImagePreview(fileInfo) {
        const imagePreview = document.getElementById('imagePreview');
        if (!imagePreview) return;
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `<img src="${fileInfo.url}" alt="${fileInfo.original_name}"><button class="preview-remove" onclick="this.closest('.preview-item').remove(); window.adminProducts.updateImagesField()"><i class="fas fa-times"></i></button>`;
        imagePreview.appendChild(previewItem);
        this.updateImagesField();
    }
    updateImagesField() {
        const imagePreview = document.getElementById('imagePreview');
        const imagesField = document.getElementById('productImages');
        if (!imagePreview || !imagesField) return;
        const images = [];
        const imgElements = imagePreview.querySelectorAll('img');
        imgElements.forEach(img => images.push(img.src));
        imagesField.value = JSON.stringify(images);
    }
    closeModal() { document.getElementById('productModal')?.classList.remove('active'); }
    closeDeleteModal() { document.getElementById('deleteModal')?.classList.remove('active'); }
    viewProduct(productId) { window.open(`/piece?id=${productId}`, '_blank'); }
    editProduct(productId) { this.openProductModal(productId); }
    confirmDelete(productId) {
        const modal = document.getElementById('deleteModal');
        const deleteProductId = document.getElementById('deleteProductId');
        if (modal && deleteProductId) {
            deleteProductId.value = productId;
            modal.classList.add('active');
        } else if (confirm('Вы уверены, что хотите удалить этот товар?')) this.deleteProduct(productId);
    }
    confirmDeleteAction() {
        const productId = document.getElementById('deleteProductId')?.value;
        if (productId) { this.deleteProduct(productId); this.closeDeleteModal(); }
    }
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            window.location.href = '/admin';
        }
    }
    showNotification(message, type) { window.showNotification(message, type); }
    escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }
}
document.addEventListener('DOMContentLoaded', function() { window.adminProducts = new AdminProductsManager(); });