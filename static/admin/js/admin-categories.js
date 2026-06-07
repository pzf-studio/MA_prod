class AdminCategoriesManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.categories = [];
        this.authToken = localStorage.getItem('admin_token');
        this.categoriesExtra = {};
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadExtraData();
        await this.loadCategories();
        this.initEventListeners();
    }

    async checkAuth() {
        if (!this.authToken) { window.location.href = '/admin'; return; }
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/verify`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            if (!response.ok) window.location.href = '/admin';
        } catch (error) { window.location.href = '/admin'; }
    }

    async loadExtraData() {
        try {
            const res = await fetch(`${this.API_BASE}/api/categories/public`);
            const data = await res.json();
            if (data.success) {
                data.categories.forEach(cat => {
                    this.categoriesExtra[cat.code] = {
                        description: cat.description || '',
                        image_url: cat.image_url || ''
                    };
                });
            }
        } catch(e) { console.error('Ошибка загрузки extra-данных категорий', e); }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE}/api/sections`);
            const data = await response.json();
            if (data.success) {
                this.categories = data.sections;
                this.renderCategories();
                this.updateCategoriesBadge();
            } else throw new Error(data.error);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }

    renderCategories() {
        const tableBody = document.getElementById('categoriesTableBody');
        const emptyState = document.getElementById('emptyState');
        if (!tableBody || !emptyState) return;
        if (this.categories.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';
        const sorted = [...this.categories].sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        tableBody.innerHTML = '';
        sorted.forEach(category => {
            const row = document.createElement('tr');
            row.dataset.id = category.id;
            const isActive = category.active !== false;
            const statusToggle = `<div class="status-toggle ${isActive ? 'active' : ''}" onclick="window.adminCategories.toggleStatus(${category.id})"></div>`;
            row.innerHTML = `
                <td style="cursor: move;">
                    <i class="fas fa-grip-vertical sortable-handle" style="margin-right: 10px;"></i>
                    <input type="number" class="order-input" value="${category.display_order || 1}" min="1" onchange="window.adminCategories.updateOrder(${category.id}, this.value)">
                </td>
                <td>${category.id}</td>
                <td><strong>${this.escapeHtml(category.name)}</strong></td>
                <td><span class="category-code">${this.escapeHtml(category.code)}</span></td>
                <td>${statusToggle}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="window.adminCategories.editCategory(${category.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="window.adminCategories.confirmDelete(${category.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        this.enableDragAndDrop();
    }

    enableDragAndDrop() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        if (window.Sortable) {
            new Sortable(tbody, {
                handle: '.sortable-handle',
                animation: 150,
                onEnd: async () => {
                    const rows = tbody.querySelectorAll('tr');
                    const newOrder = Array.from(rows).map(row => parseInt(row.dataset.id));
                    await this.saveOrder(newOrder);
                }
            });
        }
    }

    async saveOrder(order) {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/sections/reorder`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ order })
            });
            const data = await response.json();
            if (data.success) this.showNotification('Порядок сохранён', 'success');
            else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }

    async toggleStatus(categoryId) {
        try {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;
            const newActive = !(category.active !== false);
            const response = await fetch(`${this.API_BASE}/api/admin/sections/${categoryId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: newActive })
            });
            const data = await response.json();
            if (data.success) {
                category.active = newActive;
                this.renderCategories();
                this.updateCategoriesBadge();
                this.showNotification(`Категория "${category.name}" ${newActive ? 'активирована' : 'деактивирована'}`, 'success');
            } else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }

    async updateOrder(categoryId, newOrder) {
        try {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;
            newOrder = parseInt(newOrder);
            if (isNaN(newOrder) || newOrder < 1) return;
            const response = await fetch(`${this.API_BASE}/api/admin/sections/${categoryId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_order: newOrder })
            });
            const data = await response.json();
            if (data.success) {
                category.display_order = newOrder;
                this.renderCategories();
                this.showNotification('Порядок обновлен', 'success');
            } else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }

    async deleteCategory(categoryId) {
        try {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;
            const hasProducts = await this.checkProductsInCategory(category.code);
            if (hasProducts) {
                this.showNotification('Нельзя удалить категорию с товарами. Сначала переместите товары в другие категории.', 'error');
                return;
            }
            const response = await fetch(`${this.API_BASE}/api/admin/sections/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await response.json();
            if (data.success) {
                this.categories = this.categories.filter(c => c.id !== categoryId);
                this.renderCategories();
                this.updateCategoriesBadge();
                this.showNotification('Категория удалена', 'success');
            } else throw new Error(data.error);
        } catch (error) { this.showNotification(`Ошибка: ${error.message}`, 'error'); }
    }

    async checkProductsInCategory(categoryCode) {
        try {
            const response = await fetch(`${this.API_BASE}/api/products?section=${categoryCode}`);
            const data = await response.json();
            return data.products && data.products.length > 0;
        } catch (error) { console.error('Ошибка проверки товаров:', error); return false; }
    }

    updateCategoriesBadge() {
        const badge = document.getElementById('categoriesBadge');
        if (badge) {
            const activeCount = this.categories.filter(c => c.active !== false).length;
            badge.textContent = activeCount;
        }
    }

    initEventListeners() {
        const addBtn = document.getElementById('addCategoryBtn');
        const addFirstBtn = document.getElementById('addFirstCategoryBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openCategoryModal());
        if (addFirstBtn) addFirstBtn.addEventListener('click', () => this.openCategoryModal());

        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));

        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const deleteCancel = document.getElementById('deleteCancel');
        const deleteConfirm = document.getElementById('deleteConfirm');
        if (deleteCancel) deleteCancel.addEventListener('click', () => this.closeDeleteModal());
        if (deleteConfirm) deleteConfirm.addEventListener('click', () => this.confirmDeleteAction());

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });

        const nameInput = document.getElementById('categoryName');
        const codeInput = document.getElementById('categoryCode');
        if (nameInput && codeInput) {
            nameInput.addEventListener('input', () => {
                if (!codeInput.dataset.manual) {
                    codeInput.value = this.generateCode(nameInput.value);
                }
            });
            codeInput.addEventListener('input', () => { codeInput.dataset.manual = 'true'; });
        }

        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('categoryImage');
        if (imageUploadArea && imageInput) {
            imageUploadArea.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => this.handleImageSelected(e));
        }
    }

    generateCode(name) {
        return name.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, '').replace(/\s+/g, '_').replace(/[а-яё]/g, char => {
            const map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ы':'y','э':'e','ю':'yu','я':'ya'};
            return map[char] || char;
        }).replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    }

    async handleImageSelected(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }
        const previewDiv = document.getElementById('imagePreview');
        if (previewDiv) previewDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: { 'X-Admin-Request': 'true', 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('categoryImageUrl').value = data.url;
                this.showImagePreview(data.url);
                this.showNotification('Изображение загружено', 'success');
            } else {
                this.showNotification(`Ошибка загрузки: ${data.error}`, 'error');
                if (previewDiv) previewDiv.innerHTML = '';
            }
        } catch (err) {
            this.showNotification('Ошибка загрузки изображения', 'error');
            if (previewDiv) previewDiv.innerHTML = '';
        }
    }

    showImagePreview(url) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `<img src="${url}" alt="Превью" style="max-width: 200px; max-height: 100px; border-radius: 4px;">`;
        }
    }

    openCategoryModal(categoryId = null) {
        const modal = document.getElementById('categoryModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('categoryForm');
        if (!modal || !modalTitle || !form) return;

        form.reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryImageUrl').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        const codeInput = document.getElementById('categoryCode');
        if (codeInput) codeInput.dataset.manual = '';

        if (categoryId) {
            modalTitle.textContent = 'Редактировать категорию';
            this.loadCategoryData(categoryId);
        } else {
            modalTitle.textContent = 'Добавить категорию';
            const maxOrder = Math.max(...this.categories.map(c => c.display_order || 0), 0);
            document.getElementById('categoryOrder').value = maxOrder + 1;
        }
        modal.classList.add('active');
    }

    loadCategoryData(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name || '';
        document.getElementById('categoryCode').value = category.code || '';
        document.getElementById('categoryOrder').value = category.display_order || 1;
        document.getElementById('categoryStatus').value = category.active !== false ? 'true' : 'false';

        const extra = this.categoriesExtra[category.code] || {};
        document.getElementById('categoryDescription').value = extra.description || '';
        document.getElementById('categoryImageUrl').value = extra.image_url || '';
        
        if (extra.image_url) {
            this.showImagePreview(extra.image_url);
        } else {
            document.getElementById('imagePreview').innerHTML = '';
        }
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('categoryName').trim(),
            code: formData.get('categoryCode').trim().toLowerCase(),
            display_order: parseInt(formData.get('categoryOrder')) || 1,
            active: formData.get('categoryStatus') === 'true'
        };

        if (!categoryData.name) { this.showNotification('Введите название', 'error'); return; }
        if (!categoryData.code) { this.showNotification('Введите код', 'error'); return; }
        if (!/^[a-z0-9_]+$/.test(categoryData.code)) {
            this.showNotification('Код только латинские буквы, цифры и подчёркивания', 'error');
            return;
        }

        const categoryId = formData.get('categoryId');
        const existingWithCode = this.categories.find(c => c.code === categoryData.code && c.id !== parseInt(categoryId || 0));
        if (existingWithCode) { this.showNotification('Категория с таким кодом уже существует', 'error'); return; }

        try {
            const url = categoryId ?
                `${this.API_BASE}/api/admin/sections/${categoryId}` :
                `${this.API_BASE}/api/admin/sections`;
            const method = categoryId ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            const code = data.section?.code || categoryData.code;
            const extraData = {
                description: formData.get('categoryDescription') || '',
                image_url: formData.get('categoryImageUrl') || ''
            };
            await fetch(`${this.API_BASE}/api/admin/categories/extra/${code}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(extraData)
            });

            await this.loadCategories();
            await this.loadExtraData();
            this.closeModal();
            this.showNotification(categoryId ? 'Категория обновлена' : 'Категория добавлена', 'success');
        } catch (error) {
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }

    closeModal() { document.getElementById('categoryModal')?.classList.remove('active'); }
    closeDeleteModal() { document.getElementById('deleteModal')?.classList.remove('active'); }
    editCategory(categoryId) { this.openCategoryModal(categoryId); }

    async confirmDelete(categoryId) {
        const modal = document.getElementById('deleteModal');
        const deleteCategoryId = document.getElementById('deleteCategoryId');
        const deleteMessage = document.getElementById('deleteMessage');
        const deleteWarning = document.getElementById('deleteWarning');
        if (modal && deleteCategoryId) {
            deleteCategoryId.value = categoryId;
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                deleteMessage.textContent = `Вы уверены, что хотите удалить категорию "${category.name}"?`;
                const hasProducts = await this.checkProductsInCategory(category.code);
                deleteWarning.style.display = hasProducts ? 'block' : 'none';
            }
            modal.classList.add('active');
        } else if (confirm('Вы уверены, что хотите удалить эту категорию?')) this.deleteCategory(categoryId);
    }

    confirmDeleteAction() {
        const categoryId = document.getElementById('deleteCategoryId')?.value;
        if (categoryId) { this.deleteCategory(parseInt(categoryId)); this.closeDeleteModal(); }
    }

    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            window.location.href = '/admin';
        }
    }

    showNotification(message, type) { window.showNotification(message, type); }
    escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m] || m); }
}

document.addEventListener('DOMContentLoaded', () => { window.adminCategories = new AdminCategoriesManager(); });