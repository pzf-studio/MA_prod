// Админ-панель: управление товарами
class AdminProductsManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.products = [];
        this.sections = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.authToken = localStorage.getItem('admin_token');
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        await this.loadProducts();
        await this.loadSections();
        this.initEventListeners();
    }
    
    async checkAuth() {
        if (!this.authToken) {
            window.location.href = '/admin';
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/verify`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (!response.ok) {
                window.location.href = '/admin';
            }
        } catch (error) {
            window.location.href = '/admin';
        }
    }
    
    async loadProducts() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/products`, {
                headers: { 
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.products = data.products;
                this.renderProducts();
                this.updateProductsBadge();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async loadSections() {
        try {
            const response = await fetch(`${this.API_BASE}/api/sections`);
            const data = await response.json();
            
            if (data.success) {
                this.sections = data.sections;
                this.populateSectionSelect();
            }
        } catch (error) {
            console.error('Ошибка загрузки разделов:', error);
        }
    }
    
    renderProducts() {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const productsToShow = this.products.slice(startIndex, endIndex);
        
        if (productsToShow.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px;">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                        <h3>Товары не найдены</h3>
                        <p>Нет добавленных товаров. Добавьте первый товар!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        productsToShow.forEach(product => {
            const row = document.createElement('tr');
            
            // Статус
            const isActive = product.status === 'active';
            const statusToggle = `
                <div class="status-toggle ${isActive ? 'active' : ''}" 
                     onclick="window.adminProducts.toggleStatus(${product.id})">
                </div>
            `;
            
            // Изображение
            const imageUrl = product.images?.[0] || '';
            const imageCell = `
                <td class="product-image-cell">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover;">` : 
                        '<div class="no-image"><i class="fas fa-box"></i></div>'
                    }
                </td>
            `;
            
            // Бейдж
            let badgeHTML = '';
            if (product.badge) {
                const badgeClass = product.badge.toLowerCase().includes('новинка') ? 'badge-new' :
                                  product.badge.toLowerCase().includes('хит') ? 'badge-hit' :
                                  product.badge.toLowerCase().includes('акция') ? 'badge-sale' : '';
                badgeHTML = `<span class="badge-tag ${badgeClass}">${product.badge}</span>`;
            }
            
            // Дата
            const date = new Date(product.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU');
            
            // Цена - исправлено: используем dataManager если есть, иначе локальный метод
            let priceFormatted = '0 ₽';
            if (typeof dataManager !== 'undefined' && dataManager.formatPrice) {
                priceFormatted = dataManager.formatPrice(product.price);
            } else {
                priceFormatted = this.formatPrice(product.price);
            }
            
            row.innerHTML = `
                <td>${product.id}</td>
                ${imageCell}
                <td>
                    <strong>${product.name}</strong>
                    <br>
                    <small class="text-muted">${product.description?.substring(0, 100)}...</small>
                </td>
                <td>${product.category || '-'}</td>
                <td>${priceFormatted}</td>
                <td>${statusToggle}</td>
                <td>${badgeHTML}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="window.adminProducts.viewProduct(${product.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="window.adminProducts.editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.adminProducts.confirmDelete(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        this.renderPagination();
    }
    
    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.products.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        html += `
            <button class="page-item ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="window.adminProducts.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <button class="page-item ${i === this.currentPage ? 'active' : ''}" 
                            onclick="window.adminProducts.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="page-item disabled">...</span>';
            }
        }
        
        html += `
            <button class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="window.adminProducts.changePage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = html;
    }
    
    populateSectionSelect() {
        const sectionSelect = document.getElementById('productSection');
        if (!sectionSelect) return;
        
        // Очищаем существующие опции (кроме первой)
        while (sectionSelect.options.length > 1) {
            sectionSelect.remove(1);
        }
        
        // Добавляем активные разделы
        this.sections
            .filter(section => section.active)
            .forEach(section => {
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
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                product.status = newStatus;
                this.renderProducts();
                
                const statusText = newStatus === 'active' ? 'активирован' : 'деактивирован';
                this.showNotification(`Товар "${product.name}" ${statusText}`, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
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
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления товара:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    updateProductsBadge() {
        const badge = document.getElementById('productsBadge');
        if (badge) {
            badge.textContent = this.products.length;
        }
    }
    
    initEventListeners() {
        // Кнопка добавления товара
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openProductModal());
        }
        
        // Форма товара
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }
        
        // Закрытие модального окна
        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());
        
        // Подтверждение удаления
        const deleteCancel = document.getElementById('deleteCancel');
        const deleteConfirm = document.getElementById('deleteConfirm');
        if (deleteCancel) deleteCancel.addEventListener('click', () => this.closeDeleteModal());
        if (deleteConfirm) deleteConfirm.addEventListener('click', () => this.confirmDeleteAction());
        
        // Загрузка изображений
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageUpload = document.getElementById('imageUpload');
        if (imageUploadArea && imageUpload) {
            imageUploadArea.addEventListener('click', () => imageUpload.click());
            imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        // Фильтры и поиск
        const filters = ['categoryFilter', 'statusFilter', 'sortBy'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    this.currentPage = 1;
                    // Здесь можно добавить фильтрацию
                    this.renderProducts();
                });
            }
        });
        
        // Поиск
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    // Здесь можно добавить поиск
                    this.renderProducts();
                }, 500);
            });
        }
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }
    
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
        
        if (productId) {
            modalTitle.textContent = 'Редактировать товар';
            this.loadProductData(productId);
        } else {
            modalTitle.textContent = 'Добавить новый товар';
        }
        
        modal.classList.add('active');
    }
    
    loadProductData(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCode').value = product.code || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productSection').value = product.section || '';
        document.getElementById('productPrice').value = product.price || 0;
        document.getElementById('productOldPrice').value = product.old_price || '';
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('productRecommended').value = product.recommended ? 'true' : 'false';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productSpecifications').value = product.specifications || '';
        document.getElementById('productStatus').value = product.status || 'active';
        document.getElementById('productStock').value = product.stock || 10;
        
        // Загружаем изображения
        const images = product.images || [];
        const imagePreview = document.getElementById('imagePreview');
        
        if (imagePreview && images.length > 0) {
            imagePreview.innerHTML = '';
            images.forEach(image => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${image}" alt="Превью">
                    <button class="preview-remove" onclick="this.closest('.preview-item').remove(); window.adminProducts.updateImagesField()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                imagePreview.appendChild(previewItem);
            });
            
            document.getElementById('productImages').value = JSON.stringify(images);
        }
    }
    
    async handleProductSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
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
            images: JSON.parse(formData.get('productImages') || '[]')
        };
        
        const productId = formData.get('productId');
        
        try {
            const url = productId ? 
                `${this.API_BASE}/api/admin/products/${productId}` : 
                `${this.API_BASE}/api/admin/products`;
            
            const method = productId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                await this.loadProducts(); // Перезагружаем список
                
                this.closeModal();
                
                const message = productId ? 'Товар обновлен' : 'Товар добавлен';
                this.showNotification(message, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения товара:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async handleImageUpload(e) {
        const files = Array.from(e.target.files);
        
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                this.showNotification('Пожалуйста, загружайте только изображения', 'error');
                continue;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification(`Файл ${file.name} слишком большой (максимум 5MB)`, 'error');
                continue;
            }
            
            const result = await this.uploadImage(file);
            
            if (result.success) {
                this.addImagePreview(result);
            } else {
                this.showNotification(`Ошибка загрузки: ${result.error}`, 'error');
            }
        }
        
        // Очищаем input
        e.target.value = '';
    }
    
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Admin-Request': 'true',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    addImagePreview(fileInfo) {
        const imagePreview = document.getElementById('imagePreview');
        if (!imagePreview) return;
        
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${fileInfo.url}" alt="${fileInfo.original_name}">
            <button class="preview-remove" onclick="this.closest('.preview-item').remove(); window.adminProducts.updateImagesField()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        imagePreview.appendChild(previewItem);
        this.updateImagesField();
    }
    
    updateImagesField() {
        const imagePreview = document.getElementById('imagePreview');
        const imagesField = document.getElementById('productImages');
        
        if (!imagePreview || !imagesField) return;
        
        const images = [];
        const imgElements = imagePreview.querySelectorAll('img');
        
        imgElements.forEach(img => {
            images.push(img.src);
        });
        
        imagesField.value = JSON.stringify(images);
    }
    
    formatPrice(price) {
        if (!price && price !== 0) return '0 ₽';
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price).replace('₽', '₽');
    }
    
    closeModal() {
        const modal = document.getElementById('productModal');
        if (modal) modal.classList.remove('active');
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.remove('active');
    }
    
    // Методы для кнопок действий
    viewProduct(productId) {
        window.open(`/piece?id=${productId}`, '_blank');
    }
    
    editProduct(productId) {
        this.openProductModal(productId);
    }
    
    confirmDelete(productId) {
        const modal = document.getElementById('deleteModal');
        const deleteProductId = document.getElementById('deleteProductId');
        
        if (modal && deleteProductId) {
            deleteProductId.value = productId;
            modal.classList.add('active');
        } else {
            // Fallback
            if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                this.deleteProduct(productId);
            }
        }
    }
    
    confirmDeleteAction() {
        const productId = document.getElementById('deleteProductId')?.value;
        if (productId) {
            this.deleteProduct(productId);
            this.closeDeleteModal();
        }
    }
    
    changePage(page) {
        if (page < 1 || page > Math.ceil(this.products.length / this.itemsPerPage)) return;
        this.currentPage = page;
        this.renderProducts();
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            window.location.href = '/admin';
        }
    }
    
    showNotification(message, type = 'success') {
        // Удаляем старые уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon}"></i>
                ${message}
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#27ae60' : 
                        type === 'error' ? '#e74c3c' : '#f39c12'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 1000;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.adminProducts = new AdminProductsManager();
});