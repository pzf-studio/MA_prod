// Админ-панель: дашборд
class AdminDashboardManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.authToken = localStorage.getItem('admin_token');
        this.stats = {
            totalProducts: 0,
            activeCategories: 0,
            backgroundExists: false
        };
        this.activityLog = [];
        this.popularProducts = [];
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        await this.loadAllData();
        this.initEventListeners();
        this.updateBadges();
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
    
    async loadAllData() {
        try {
            // Загружаем все данные параллельно
            await Promise.all([
                this.loadProducts(),
                this.loadCategories(),
                this.loadBackground(),
                this.loadActivity(),
                this.loadPopularProducts()
            ]);
        } catch (error) {
            console.error('Ошибка загрузки данных дашборда:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }
    
    async loadProducts() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/dashboard/stats`);
            const data = await response.json();
            
            if (data.success) {
                this.stats.totalProducts = data.stats.total_products || 0;
                this.stats.activeProducts = data.stats.active_products || 0;
                this.updateProductsDisplay();
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики товаров:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/dashboard/stats`);
            const data = await response.json();
            
            if (data.success) {
                this.stats.activeCategories = data.stats.active_sections || 0;
                this.updateCategoriesDisplay();
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики категорий:', error);
        }
    }
    
    async loadBackground() {
        try {
            const response = await fetch(`${this.API_BASE}/api/media/background`);
            const data = await response.json();
            
            if (data.success && data.background) {
                this.stats.backgroundExists = true;
                this.currentBackground = data.background;
                this.updateBackgroundDisplay();
                this.updateBackgroundPreview();
            } else {
                this.stats.backgroundExists = false;
                this.updateBackgroundDisplay();
                this.updateBackgroundPreview();
            }
        } catch (error) {
            console.error('Ошибка загрузки фона:', error);
            this.stats.backgroundExists = false;
            this.updateBackgroundDisplay();
        }
    }
    
    async loadActivity() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/dashboard/activity`, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.activityLog = data.activity || [];
                this.renderActivity();
            } else {
                this.generateDemoActivity();
                this.renderActivity();
            }
        } catch (error) {
            console.error('Ошибка загрузки активности:', error);
            this.generateDemoActivity();
            this.renderActivity();
        }
    }
    
    async loadPopularProducts() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/dashboard/popular-products`, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.popularProducts = data.products || [];
                this.renderPopularProducts();
            }
        } catch (error) {
            console.error('Ошибка загрузки популярных товаров:', error);
            this.renderPopularProducts();
        }
    }
    
    generateActivityFromProducts(products) {
        this.activityLog = [];
        
        // Берем последние 5 товаров
        const recentProducts = [...products]
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 5);
        
        recentProducts.forEach(product => {
            const date = new Date(product.created_at || Date.now());
            const timeAgo = this.getTimeAgo(date);
            
            this.activityLog.push({
                type: 'product',
                title: 'Добавлен новый товар',
                description: product.name,
                time: timeAgo,
                icon: 'fas fa-box',
                iconClass: 'product'
            });
        });
        
        // Добавляем обновление фона если есть
        if (this.currentBackground && this.currentBackground.updated_at) {
            const bgDate = new Date(this.currentBackground.updated_at);
            const bgTimeAgo = this.getTimeAgo(bgDate);
            
            this.activityLog.unshift({
                type: 'background',
                title: 'Обновлено фоновое изображение',
                description: this.currentBackground.title || 'Главный фон',
                time: bgTimeAgo,
                icon: 'fas fa-image',
                iconClass: 'user'
            });
        }
        
        // Ограничиваем 5 записями
        this.activityLog = this.activityLog.slice(0, 5);
    }
    
    generateDemoActivity() {
        // Демо активность если не удалось загрузить данные
        const now = new Date();
        
        this.activityLog = [
            {
                type: 'system',
                title: 'Система запущена',
                description: 'Админ панель инициализирована',
                time: this.getTimeAgo(new Date(now.getTime() - 5 * 60000)), // 5 минут назад
                icon: 'fas fa-check-circle',
                iconClass: 'success'
            },
            {
                type: 'product',
                title: 'Добавлен демо товар',
                description: 'Электрический пантограф Premium',
                time: this.getTimeAgo(new Date(now.getTime() - 2 * 3600000)), // 2 часа назад
                icon: 'fas fa-box',
                iconClass: 'product'
            },
            {
                type: 'category',
                title: 'Создана категория',
                description: 'Пантографы',
                time: this.getTimeAgo(new Date(now.getTime() - 24 * 3600000)), // 1 день назад
                icon: 'fas fa-tags',
                iconClass: 'order'
            }
        ];
    }
    
    updateProductsDisplay() {
        const totalProductsEl = document.getElementById('totalProducts');
        const productsTrendEl = document.getElementById('productsTrend');
        
        if (totalProductsEl) {
            totalProductsEl.textContent = this.stats.totalProducts;
        }
        
        if (productsTrendEl) {
            // Можно реализовать реальную логику тренда
            productsTrendEl.textContent = '+0%';
        }
    }
    
    updateCategoriesDisplay() {
        const totalCategoriesEl = document.getElementById('totalCategories');
        const categoriesTrendEl = document.getElementById('categoriesTrend');
        
        if (totalCategoriesEl) {
            totalCategoriesEl.textContent = this.stats.activeCategories;
        }
        
        if (categoriesTrendEl) {
            categoriesTrendEl.textContent = '+0%';
        }
    }
    
    updateBackgroundDisplay() {
        const backgroundStatusEl = document.getElementById('backgroundStatusText');
        
        if (backgroundStatusEl) {
            if (this.stats.backgroundExists) {
                backgroundStatusEl.textContent = 'Установлен';
                backgroundStatusEl.style.color = '#28a745';
            } else {
                backgroundStatusEl.textContent = 'Нет';
                backgroundStatusEl.style.color = '#dc3545';
            }
        }
    }
    
    updateBackgroundPreview() {
        const previewContainer = document.getElementById('backgroundPreview');
        
        if (!previewContainer) return;
        
        if (this.stats.backgroundExists && this.currentBackground && this.currentBackground.image_url) {
            previewContainer.innerHTML = `
                <h4>${this.currentBackground.title || 'Главный фон'}</h4>
                <div class="preview-image-container">
                    <img src="${this.currentBackground.image_url}" 
                         alt="${this.currentBackground.title || 'Фон'}" 
                         class="preview-image"
                         onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div class=\"no-background-message\"><i class=\"fas fa-image\"></i><p>Ошибка загрузки изображения</p></div>'">
                </div>
                <div class="background-status ${this.currentBackground.active ? 'background-active' : 'background-inactive'}">
                    ${this.currentBackground.active ? 'Активный' : 'Неактивный'}
                </div>
                <p style="font-size: 0.85rem; color: #6c757d; margin-top: 10px;">
                    <i class="fas fa-calendar-alt"></i> 
                    Обновлен: ${this.formatDate(this.currentBackground.updated_at)}
                </p>
            `;
        } else {
            previewContainer.innerHTML = `
                <div class="preview-image-container">
                    <div class="no-background-message">
                        <i class="fas fa-image"></i>
                        <p>Фон не установлен</p>
                    </div>
                </div>
                <p style="font-size: 0.85rem; color: #6c757d; margin-top: 10px;">
                    <i class="fas fa-info-circle"></i> 
                    Установите фоновое изображение в разделе "Медиа"
                </p>
            `;
        }
    }
    
    renderActivity() {
        const activityFeed = document.getElementById('activityFeed');
        
        if (!activityFeed || this.activityLog.length === 0) return;
        
        let html = '';
        
        this.activityLog.forEach(activity => {
            html += `
                <div class="activity-item">
                    <div class="activity-icon ${activity.iconClass}">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                        <div class="activity-time">
                            <i class="fas fa-clock"></i>
                            ${activity.time}
                        </div>
                    </div>
                </div>
            `;
        });
        
        activityFeed.innerHTML = html;
    }
    
    renderPopularProducts() {
        const popularProductsContainer = document.getElementById('popularProducts');
        
        if (!popularProductsContainer) return;
        
        if (this.popularProducts.length === 0) {
            popularProductsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6c757d;">
                    <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Нет популярных товаров</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        this.popularProducts.forEach(product => {
            const imageUrl = product.images?.[0] || '';
            const badge = product.badge ? `<span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-left: 5px;">${product.badge}</span>` : '';
            
            html += `
                <div class="popular-product">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">` : 
                        '<div style="width: 60px; height: 60px; background: #f8f9fa; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #adb5bd;"><i class="fas fa-box"></i></div>'
                    }
                    <div class="product-info">
                        <h4>${product.name} ${badge}</h4>
                        <p>${this.formatPrice(product.price || 0)}</p>
                    </div>
                </div>
            `;
        });
        
        popularProductsContainer.innerHTML = html;
    }
    
    updateBadges() {
        // Обновляем бейджи в боковом меню
        const productsBadge = document.getElementById('productsBadge');
        const categoriesBadge = document.getElementById('categoriesBadge');
        
        if (productsBadge) {
            productsBadge.textContent = this.stats.totalProducts;
        }
        
        if (categoriesBadge) {
            categoriesBadge.textContent = this.stats.activeCategories;
        }
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 0) {
            return `${diffDay} дн. назад`;
        } else if (diffHour > 0) {
            return `${diffHour} ч. назад`;
        } else if (diffMin > 0) {
            return `${diffMin} мин. назад`;
        } else {
            return 'только что';
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatPrice(price) {
        if (!price && price !== 0) return '0 ₽';
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }
    
    initEventListeners() {
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Кнопка обновления данных
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAllData();
                this.showNotification('Данные обновлены', 'success');
            });
        }
        
        // Переключение боковой панели
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                }
            });
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
    window.adminDashboard = new AdminDashboardManager();
    
    // Обновление данных каждые 5 минут
    setInterval(() => {
        if (window.adminDashboard) {
            window.adminDashboard.loadAllData();
        }
    }, 5 * 60 * 1000);
});