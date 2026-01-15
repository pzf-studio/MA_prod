// Data Manager для работы с Flask API (БЕЗ КЭШИРОВАНИЯ ТОВАРОВ)
class DataManager {
    constructor() {
        this.API_BASE = window.location.origin;
        console.log('DataManager инициализирован, API_BASE:', this.API_BASE);
        
        // Храним только корзину локально
        this.localData = {
            cart: JSON.parse(localStorage.getItem('ma_furniture_cart') || '[]')
        };
    }

    // ========== ТОВАРЫ (ВСЕГДА С СЕРВЕРА) ==========
    async getAllProducts() {
        try {
            console.log('Запрос товаров с сервера...');
            const response = await fetch(`${this.API_BASE}/api/products?status=active`);
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                console.log(`Получено товаров: ${data.products.length}`);
                return data.products;
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Ошибка получения товаров:', error);
            // Возвращаем пустой массив при ошибке
            return [];
        }
    }

    async getActiveProducts() {
        // Просто вызываем getAllProducts, так как сервер уже фильтрует по status=active
        return await this.getAllProducts();
    }

    async getProductById(id) {
        try {
            const response = await fetch(`${this.API_BASE}/api/products/${id}`);
            const data = await response.json();
            
            if (data.success) {
                return data.product;
            } else {
                throw new Error(data.error || 'Товар не найден');
            }
        } catch (error) {
            console.error('Ошибка получения товара:', error);
            return null;
        }
    }

    // ========== РАЗДЕЛЫ (ВСЕГДА С СЕРВЕРА) ==========
    async getAllSections() {
        try {
            const response = await fetch(`${this.API_BASE}/api/sections`);
            const data = await response.json();
            
            if (data.success) {
                return data.sections;
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Ошибка получения разделов:', error);
            return [];
        }
    }

    async getActiveSections() {
        const sections = await this.getAllSections();
        return sections.filter(s => s.active);
    }

    // ========== КОРЗИНА (ЛОКАЛЬНАЯ) ==========
    getCart() {
        return this.localData.cart;
    }

    saveCart(cart) {
        this.localData.cart = cart;
        localStorage.setItem('ma_furniture_cart', JSON.stringify(cart));
    }

    // ========== ЗАКАЗЫ ==========
    async submitOrder(orderData) {
        try {
            const response = await fetch(`${this.API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error: ${response.status}`);
            }
            
            return data;
            
        } catch (error) {
            console.error('Ошибка отправки заказа:', error);
            return { 
                success: false, 
                error: error.message || 'Ошибка сети. Попробуйте позже.' 
            };
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

    // ========== ДЕБАГ ==========
    debug() {
        console.log('=== Data Manager Debug ===');
        console.log('Товаров в корзине:', this.localData.cart.length);
        console.log('========================');
    }
}

// Глобальный инстанс
window.dataManager = new DataManager();

// Запускаем проверку подключения при загрузке
window.addEventListener('load', () => {
    // Просто инициализируем, но не кэшируем товары
    console.log('Магазин загружен, данные будут запрашиваться с сервера');
});

window.formatPrice = function(price) {
    if (window.dataManager && window.dataManager.formatPrice) {
        return window.dataManager.formatPrice(price);
    }
    // Fallback
    if (!price && price !== 0) return '0 ₽';
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
};

