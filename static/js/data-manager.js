// Data Manager для работы с Flask API
class DataManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.isOnline = false;
        this.localData = {
            products: JSON.parse(localStorage.getItem('products_cache') || '[]'),
            sections: JSON.parse(localStorage.getItem('sections_cache') || '[]'),
            cart: JSON.parse(localStorage.getItem('ma_furniture_cart') || '[]')
        };
        
        this.checkConnection();
        console.log('Data Manager инициализирован');
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.API_BASE}/api/health`, { 
                method: 'GET',
                timeout: 3000 
            });
            this.isOnline = response.ok;
        } catch (error) {
            this.isOnline = false;
            console.log('API недоступен, используем локальные данные');
        }
    }

    // ========== ТОВАРЫ ==========
    async getAllProducts() {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.API_BASE}/api/products?status=active`);
                const data = await response.json();
                if (data.success) {
                    // Кэшируем данные локально
                    this.localData.products = data.products;
                    localStorage.setItem('products_cache', JSON.stringify(data.products));
                    return data.products;
                }
            } catch (error) {
                console.error('Ошибка получения товаров:', error);
            }
        }
        return this.localData.products;
    }

    async getActiveProducts() {
        const products = await this.getAllProducts();
        return products.filter(p => p.status === 'active');
    }

    async getProductById(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.API_BASE}/api/products/${id}`);
                const data = await response.json();
                if (data.success) return data.product;
            } catch (error) {
                console.error('Ошибка получения товара:', error);
            }
        }
        return this.localData.products.find(p => p.id === parseInt(id));
    }

    // ========== РАЗДЕЛЫ ==========
    async getAllSections() {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.API_BASE}/api/sections`);
                const data = await response.json();
                if (data.success) {
                    this.localData.sections = data.sections;
                    localStorage.setItem('sections_cache', JSON.stringify(data.sections));
                    return data.sections;
                }
            } catch (error) {
                console.error('Ошибка получения разделов:', error);
            }
        }
        return this.localData.sections;
    }

    async getActiveSections() {
        const sections = await this.getAllSections();
        return sections.filter(s => s.active);
    }

    // ========== КОРЗИНА ==========
    getCart() {
        return this.localData.cart;
    }

    saveCart(cart) {
        this.localData.cart = cart;
        localStorage.setItem('ma_furniture_cart', JSON.stringify(cart));
    }

    // ========== ЗАКАЗЫ ==========
    async submitOrder(orderData) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.API_BASE}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                return await response.json();
            } catch (error) {
                console.error('Ошибка отправки заказа:', error);
                return { success: false, error: 'Ошибка сети' };
            }
        }
        
        // Офлайн режим: сохраняем в localStorage
        const orders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        orderData.id = Date.now();
        orderData.status = 'pending';
        orders.push(orderData);
        localStorage.setItem('pending_orders', JSON.stringify(orders));
        
        return { 
            success: true, 
            offline: true,
            message: 'Заказ сохранен локально. Отправится при подключении.' 
        };
    }

    // ========== ЗАГРУЗКА ФАЙЛОВ ==========
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            return { success: false, error: 'Ошибка загрузки' };
        }
    }

    // ========== ФОРМАТИРОВАНИЕ ==========
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    // ========== СИНХРОНИЗАЦИЯ ==========
    async syncPendingOrders() {
        if (!this.isOnline) return;
        
        const orders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        if (orders.length === 0) return;
        
        for (const order of orders) {
            const result = await this.submitOrder(order);
            if (result.success && !result.offline) {
                // Удаляем успешно отправленный заказ
                const index = orders.findIndex(o => o.id === order.id);
                if (index !== -1) {
                    orders.splice(index, 1);
                }
            }
        }
        
        localStorage.setItem('pending_orders', JSON.stringify(orders));
    }

    // ========== ДЕБАГ ==========
    debug() {
        console.log('=== Data Manager Debug ===');
        console.log('API доступен:', this.isOnline);
        console.log('Товаров в кэше:', this.localData.products.length);
        console.log('Разделов в кэше:', this.localData.sections.length);
        console.log('Товаров в корзине:', this.localData.cart.length);
        console.log('Ожидающих заказов:', 
            JSON.parse(localStorage.getItem('pending_orders') || '[]').length);
        console.log('========================');
    }
}

// Глобальный инстанс
window.dataManager = new DataManager();

// Запускаем синхронизацию при загрузке
window.addEventListener('load', () => {
    setTimeout(() => dataManager.syncPendingOrders(), 5000);
});