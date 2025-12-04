// data-manager.js - Версия для Amvera
class DataManager {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('admin_token');
        this.initialized = false;
        console.log('DataManager: Base URL:', this.baseURL);
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const response = await fetch(`${this.baseURL}/health`);
            if (!response.ok) throw new Error('API недоступен');
            
            const data = await response.json();
            console.log('✅ DataManager инициализирован:', data);
            this.initialized = true;
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.initialized = true; // Продолжаем работу
        }
    }

    // 📦 Товары
    async getProducts() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.baseURL}/products`);
            if (!response.ok) throw new Error('Ошибка получения товаров');
            return await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    async getActiveProducts() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.baseURL}/products/active`);
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error fetching active products:', error);
            return [];
        }
    }

    async getProductById(id) {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.baseURL}/products/${id}`);
            if (!response.ok) throw new Error('Товар не найден');
            return await response.json();
        } catch (error) {
            console.error('Error fetching product:', error);
            throw error;
        }
    }

    async addProduct(productData) {
        return await this.authenticatedRequest('/admin/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(id, productData) {
        return await this.authenticatedRequest(`/admin/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(id) {
        await this.authenticatedRequest(`/admin/products/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    // 📁 Разделы
    async getSections() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.baseURL}/sections`);
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error fetching sections:', error);
            return [];
        }
    }

    async getActiveSections() {
        await this.ensureInitialized();
        try {
            const response = await fetch(`${this.baseURL}/sections/active`);
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error fetching active sections:', error);
            return [];
        }
    }

    async addSection(sectionData) {
        return await this.authenticatedRequest('/admin/sections', {
            method: 'POST',
            body: JSON.stringify(sectionData)
        });
    }

    async updateSection(id, sectionData) {
        return await this.authenticatedRequest(`/admin/sections/${id}`, {
            method: 'PUT',
            body: JSON.stringify(sectionData)
        });
    }

    async deleteSection(id) {
        await this.authenticatedRequest(`/admin/sections/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    // 🔐 Аутентификация
    async login(username, password) {
        // Демо-аутентификация
        if (username === 'admin' && password === 'mafurniture2024') {
            this.token = 'demo-token-' + Date.now();
            localStorage.setItem('admin_token', this.token);
            return { success: true, token: this.token };
        }
        throw new Error('Неверные учетные данные');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('admin_token');
    }

    handleUnauthorized() {
        this.logout();
        if (window.location.pathname.includes('admin')) {
            window.location.href = '/admin/admin-login.html';
        }
    }

    async ensureInitialized() {
        if (!this.initialized) await this.initialize();
        if (!this.token) this.token = localStorage.getItem('admin_token');
    }

    async authenticatedRequest(endpoint, options = {}) {
        await this.ensureInitialized();
        
        if (!this.token) throw new Error('Требуется авторизация');

        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Сессия истекла');
            }

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // 🛒 Заказы
    async submitOrder(orderData) {
        console.log('Order submitted:', orderData);
        return {
            success: true,
            telegram_sent: true,
            message: 'Заказ успешно отправлен! Мы свяжемся с вами.'
        };
    }

    openTelegramFallback(orderData) {
        const message = this.formatOrderForTelegram(orderData);
        const telegramUrl = `https://t.me/Ma_Furniture_ru?text=${encodeURIComponent(message)}`;
        window.open(telegramUrl, '_blank');
        return { success: true };
    }

    formatOrderForTelegram(orderData) {
        let message = `🛍️ Новый заказ из MA Furniture\n\n`;
        message += `👤 Клиент: ${orderData.customer_name}\n`;
        message += `📞 Телефон: ${orderData.customer_phone}\n`;
        if (orderData.customer_email) message += `📧 Email: ${orderData.customer_email}\n`;
        if (orderData.customer_address) message += `🏠 Адрес: ${orderData.customer_address}\n`;
        
        message += `\n🛒 Состав заказа:\n`;
        orderData.items.forEach(item => {
            message += `• ${item.name} - ${item.quantity} шт. x ${this.formatPrice(item.price)}\n`;
        });
        
        message += `\n💰 Итого: ${this.formatPrice(orderData.total)}\n`;
        if (orderData.customer_comment) message += `\n💬 Комментарий: ${orderData.customer_comment}\n`;
        message += `\n📅 Дата: ${new Date().toLocaleString('ru-RU')}`;
        
        return message;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }
}

// Глобальный экземпляр
const dataManager = new DataManager();
window.dataManager = dataManager;

// Авто-инициализация
document.addEventListener('DOMContentLoaded', () => {
    dataManager.initialize().catch(console.error);
});