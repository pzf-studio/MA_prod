// Админ-панель: управление категориями (разделами)
class AdminCategoriesManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.categories = [];
        this.authToken = localStorage.getItem('admin_token');
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        await this.loadCategories();
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
    
    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE}/api/sections`);
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.sections;
                this.renderCategories();
                this.updateCategoriesBadge();
            } else {
                throw new Error(data.error);
            }
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
        
        // Сортируем по display_order
        const sortedCategories = [...this.categories].sort((a, b) => 
            (a.display_order || 999) - (b.display_order || 999)
        );
        
        tableBody.innerHTML = '';
        
        sortedCategories.forEach(category => {
            const row = document.createElement('tr');
            
            // Статус
            const isActive = category.active !== false; // по умолчанию true
            const statusToggle = `
                <div class="status-toggle ${isActive ? 'active' : ''}" 
                     onclick="window.adminCategories.toggleStatus(${category.id})">
                </div>
            `;
            
            row.innerHTML = `
                <td>
                    <input type="number" 
                           class="order-input" 
                           value="${category.display_order || 1}" 
                           min="1" 
                           onchange="window.adminCategories.updateOrder(${category.id}, this.value)">
                </td>
                <td>${category.id}</td>
                <td>
                    <strong>${category.name}</strong>
                </td>
                <td>
                    <span class="category-code">${category.code}</span>
                </td>
                <td>${statusToggle}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="window.adminCategories.editCategory(${category.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.adminCategories.confirmDelete(${category.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    async toggleStatus(categoryId) {
        try {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;
            
            const newActive = !(category.active !== false); // Инвертируем текущее значение
            
            const response = await fetch(`${this.API_BASE}/api/admin/sections/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: newActive })
            });
            
            const data = await response.json();
            
            if (data.success) {
                category.active = newActive;
                this.renderCategories();
                
                const statusText = newActive ? 'активирована' : 'деактивирована';
                this.showNotification(`Категория "${category.name}" ${statusText}`, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async updateOrder(categoryId, newOrder) {
        try {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;
            
            newOrder = parseInt(newOrder);
            if (isNaN(newOrder) || newOrder < 1) return;
            
            const response = await fetch(`${this.API_BASE}/api/admin/sections/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ display_order: newOrder })
            });
            
            const data = await response.json();
            
            if (data.success) {
                category.display_order = newOrder;
                this.renderCategories();
                this.showNotification('Порядок обновлен', 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка обновления порядка:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async deleteCategory(categoryId) {
        try {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;
            
            // Проверяем, есть ли товары в этой категории
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
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления категории:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    async checkProductsInCategory(categoryCode) {
        try {
            const response = await fetch(`${this.API_BASE}/api/products?section=${categoryCode}`);
            const data = await response.json();
            return data.products && data.products.length > 0;
        } catch (error) {
            console.error('Ошибка проверки товаров:', error);
            return false;
        }
    }
    
    updateCategoriesBadge() {
        const badge = document.getElementById('categoriesBadge');
        if (badge) {
            const activeCount = this.categories.filter(c => c.active !== false).length;
            badge.textContent = activeCount;
        }
    }
    
    initEventListeners() {
        // Кнопка добавления категории
        const addBtn = document.getElementById('addCategoryBtn');
        const addFirstBtn = document.getElementById('addFirstCategoryBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openCategoryModal());
        if (addFirstBtn) addFirstBtn.addEventListener('click', () => this.openCategoryModal());
        
        // Форма категории
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }
        
        // Закрытие модальных окон
        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());
        
        const deleteCancel = document.getElementById('deleteCancel');
        const deleteConfirm = document.getElementById('deleteConfirm');
        if (deleteCancel) deleteCancel.addEventListener('click', () => this.closeDeleteModal());
        if (deleteConfirm) deleteConfirm.addEventListener('click', () => this.confirmDeleteAction());
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Автоматическое создание кода из названия
        const nameInput = document.getElementById('categoryName');
        const codeInput = document.getElementById('categoryCode');
        if (nameInput && codeInput) {
            nameInput.addEventListener('input', () => {
                if (!codeInput.dataset.manual) {
                    const code = this.generateCode(nameInput.value);
                    codeInput.value = code;
                }
            });
            
            codeInput.addEventListener('input', () => {
                codeInput.dataset.manual = 'true';
            });
        }
    }
    
    generateCode(name) {
        return name
            .toLowerCase()
            .replace(/[^a-zа-яё0-9\s]/g, '') // Удаляем спецсимволы
            .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
            .replace(/[а-яё]/g, char => {
                // Транслитерация кириллицы
                const map = {
                    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
                    'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
                    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
                    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
                    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
                    'ш': 'sh', 'щ': 'sch', 'ы': 'y', 'э': 'e', 'ю': 'yu',
                    'я': 'ya'
                };
                return map[char] || char;
            })
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
    
    openCategoryModal(categoryId = null) {
        const modal = document.getElementById('categoryModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('categoryForm');
        
        if (!modal || !modalTitle || !form) return;
        
        form.reset();
        document.getElementById('categoryId').value = '';
        
        // Сбрасываем флаг ручного ввода кода
        const codeInput = document.getElementById('categoryCode');
        if (codeInput) {
            codeInput.dataset.manual = '';
        }
        
        if (categoryId) {
            modalTitle.textContent = 'Редактировать категорию';
            this.loadCategoryData(categoryId);
        } else {
            modalTitle.textContent = 'Добавить категорию';
            // Устанавливаем следующий порядковый номер
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
        
        // Валидация
        if (!categoryData.name) {
            this.showNotification('Введите название категории', 'error');
            return;
        }
        
        if (!categoryData.code) {
            this.showNotification('Введите код категории', 'error');
            return;
        }
        
        if (!/^[a-z0-9_]+$/.test(categoryData.code)) {
            this.showNotification('Код может содержать только латинские буквы, цифры и подчеркивания', 'error');
            return;
        }
        
        // Проверяем уникальность кода (кроме текущей категории при редактировании)
        const categoryId = formData.get('categoryId');
        const existingWithCode = this.categories.find(c => 
            c.code === categoryData.code && c.id !== parseInt(categoryId || 0)
        );
        
        if (existingWithCode) {
            this.showNotification('Категория с таким кодом уже существует', 'error');
            return;
        }
        
        try {
            const url = categoryId ? 
                `${this.API_BASE}/api/admin/sections/${categoryId}` : 
                `${this.API_BASE}/api/admin/sections`;
            
            const method = categoryId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                await this.loadCategories(); // Перезагружаем список
                
                this.closeModal();
                
                const message = categoryId ? 'Категория обновлена' : 'Категория добавлена';
                this.showNotification(message, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения категории:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) modal.classList.remove('active');
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.remove('active');
    }
    
    editCategory(categoryId) {
        this.openCategoryModal(categoryId);
    }
    
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
                
                // Проверяем наличие товаров
                const hasProducts = await this.checkProductsInCategory(category.code);
                deleteWarning.style.display = hasProducts ? 'block' : 'none';
            }
            
            modal.classList.add('active');
        } else {
            // Fallback
            if (confirm('Вы уверены, что хотите удалить эту категорию?')) {
                this.deleteCategory(categoryId);
            }
        }
    }
    
    confirmDeleteAction() {
        const categoryId = document.getElementById('deleteCategoryId')?.value;
        if (categoryId) {
            this.deleteCategory(parseInt(categoryId));
            this.closeDeleteModal();
        }
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
    window.adminCategories = new AdminCategoriesManager();
});