// static/js/cart-system.js
// Единая система корзины для всех страниц магазина

class CartSystem {
    constructor(options = {}) {
        // Селекторы по умолчанию (для shop.html)
        this.defaultSelectors = {
            cartIcon: '#cartIcon',
            cartCount: '#cartCount',
            cartOverlay: '#cartOverlay',
            cartClose: '#cartClose',
            cartItems: '#cartItems',
            cartEmpty: '#cartEmpty',
            cartFooter: '#cartFooter',
            cartTotalAmount: '#cartTotalAmount',
            continueShoppingBtn: '#continueShoppingBtn',
            checkoutBtn: '#checkoutBtn'
        };
        
        // Объединяем с переданными селекторами
        this.selectors = { ...this.defaultSelectors, ...options.selectors };
        
        this.cart = dataManager.getCart();
        console.log('CartSystem инициализирован, товаров в корзине:', this.cart.length);
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCartUI();
    }
    
    bindEvents() {
        const { cartIcon, cartClose, continueShoppingBtn, checkoutBtn, cartOverlay } = this.selectors;
        
        // Кнопка открытия корзины
        const cartIconEl = document.querySelector(cartIcon);
        if (cartIconEl) {
            cartIconEl.addEventListener('click', () => this.openCart());
            console.log('Найден элемент корзины:', cartIcon);
        }
        
        // Кнопка закрытия корзины
        const cartCloseEl = document.querySelector(cartClose);
        if (cartCloseEl) {
            cartCloseEl.addEventListener('click', () => this.closeCart());
        }
        
        // Кнопка "Продолжить покупки"
        const continueShoppingBtnEl = document.querySelector(continueShoppingBtn);
        if (continueShoppingBtnEl) {
            continueShoppingBtnEl.addEventListener('click', () => this.closeCart());
        }
        
        // Кнопка оформления заказа
        const checkoutBtnEl = document.querySelector(checkoutBtn);
        if (checkoutBtnEl) {
            checkoutBtnEl.addEventListener('click', () => this.checkout());
        }
        
        // Закрытие по клику вне корзины
        const cartOverlayEl = document.querySelector(cartOverlay);
        if (cartOverlayEl) {
            cartOverlayEl.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeCart();
                }
            });
        }
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            const overlay = document.querySelector(this.selectors.cartOverlay);
            if (e.key === 'Escape' && overlay?.classList.contains('active')) {
                this.closeCart();
            }
        });
    }
    
    openCart() {
        const overlay = document.querySelector(this.selectors.cartOverlay);
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.renderCart();
            console.log('Корзина открыта');
        } else {
            console.warn('Элемент корзины не найден:', this.selectors.cartOverlay);
        }
    }
    
    closeCart() {
        const overlay = document.querySelector(this.selectors.cartOverlay);
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            console.log('Корзина закрыта');
        }
    }
    
    addToCart(product) {
        if (!product || !product.id) {
            console.error('Некорректный товар для добавления в корзину:', product);
            return;
        }
        
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || '',
                quantity: 1
            });
        }
        
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.showAddToCartAnimation();
        this.showNotification(`"${product.name}" добавлен в корзину`, 'success');
        console.log('Товар добавлен в корзину:', product.name);
    }
    
    removeFromCart(productId) {
        const initialLength = this.cart.length;
        this.cart = this.cart.filter(item => item.id !== productId);
        
        if (this.cart.length !== initialLength) {
            dataManager.saveCart(this.cart);
            this.updateCartUI();
            this.renderCart();
            this.showNotification('Товар удален из корзины', 'success');
            console.log('Товар удален из корзины:', productId);
        }
    }
    
    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;
        
        item.quantity += change;
        
        if (item.quantity < 1) {
            this.removeFromCart(productId);
            return;
        }
        
        if (item.quantity > 99) {
            item.quantity = 99;
            this.showNotification('Максимум 99 шт.', 'error');
        }
        
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.renderCart();
        console.log('Количество обновлено:', productId, 'новое количество:', item.quantity);
    }
    
    updateCartUI() {
        const cartCount = document.querySelector(this.selectors.cartCount);
        const cartIcon = document.querySelector(this.selectors.cartIcon);
        
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            
            if (totalItems > 0) {
                cartCount.classList.add('show');
                cartCount.style.animation = 'none';
                setTimeout(() => {
                    cartCount.style.animation = 'cartBounce 0.5s ease';
                }, 10);
            } else {
                cartCount.classList.remove('show');
            }
            
            console.log('Обновлен счетчик корзины:', totalItems, 'товаров');
        }
        
        // Если корзина открыта, перерисовываем содержимое
        const overlay = document.querySelector(this.selectors.cartOverlay);
        if (overlay?.classList.contains('active')) {
            this.renderCart();
        }
    }
    
    renderCart() {
        const cartItems = document.querySelector(this.selectors.cartItems);
        const cartEmpty = document.querySelector(this.selectors.cartEmpty);
        const cartFooter = document.querySelector(this.selectors.cartFooter);
        const cartTotalAmount = document.querySelector(this.selectors.cartTotalAmount);
        
        if (!cartItems || !cartEmpty || !cartFooter) {
            console.warn('Не найдены элементы корзины для рендеринга');
            return;
        }
        
        if (this.cart.length === 0) {
            cartItems.style.display = 'none';
            cartEmpty.style.display = 'block';
            cartFooter.style.display = 'none';
            console.log('Корзина пуста');
            return;
        }
        
        cartEmpty.style.display = 'none';
        cartItems.style.display = 'block';
        cartFooter.style.display = 'block';
        
        let total = 0;
        let itemsHTML = '';
        
        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const imageHTML = item.image ? 
                `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
                '';
            
            itemsHTML += `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-image">
                        ${imageHTML}
                        <div class="image-placeholder" style="${item.image ? 'display: none;' : ''}">
                            <i class="fas fa-couch"></i>
                        </div>
                    </div>
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${item.name}</h4>
                        <div class="cart-item-price">${dataManager.formatPrice(item.price)}</div>
                        <div class="cart-item-actions">
                            <div class="quantity-controls">
                                <button class="quantity-btn decrease-btn" onclick="window.cartSystem.updateQuantity(${item.id}, -1)">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" 
                                       onchange="window.cartSystem.updateQuantity(${item.id}, parseInt(this.value) - ${item.quantity})">
                                <button class="quantity-btn increase-btn" onclick="window.cartSystem.updateQuantity(${item.id}, 1)">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button class="remove-item" onclick="window.cartSystem.removeFromCart(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cartItems.innerHTML = itemsHTML;
        
        if (cartTotalAmount) {
            cartTotalAmount.textContent = dataManager.formatPrice(total);
            console.log('Общая сумма корзины:', total);
        }
        
        const checkoutBtn = document.querySelector(this.selectors.checkoutBtn);
        if (checkoutBtn) {
            checkoutBtn.disabled = this.cart.length === 0;
        }
    }
    
    async checkout() {
        if (this.cart.length === 0) {
            this.showNotification('Корзина пуста', 'error');
            return;
        }
        
        // Простая реализация - можно расширить позже
        const orderData = {
            customer_name: prompt('Введите ваше имя:') || 'Клиент',
            customer_phone: prompt('Введите ваш телефон:') || 'Не указан',
            items: this.cart,
            total: this.getCartTotal()
        };
        
        try {
            const result = await dataManager.submitOrder(orderData);
            if (result.success) {
                this.showNotification('Заказ успешно отправлен! Мы свяжемся с вами.', 'success');
                this.clearCart();
            } else {
                this.showNotification(`Ошибка: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            this.showNotification('Произошла ошибка при отправке заказа', 'error');
        }
    }
    
    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    clearCart() {
        this.cart = [];
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.renderCart();
        console.log('Корзина очищена');
    }
    
    showAddToCartAnimation() {
        const cartIcon = document.querySelector(this.selectors.cartIcon);
        if (cartIcon) {
            cartIcon.classList.add('animate');
            setTimeout(() => cartIcon.classList.remove('animate'), 500);
        }
    }
    
    showNotification(message, type = 'success') {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                ${message}
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            opacity: 0;
            transform: translateX(120%);
            transition: opacity 0.3s, transform 0.3s;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Глобальные вспомогательные функции для inline обработчиков
window.updateCartQuantity = function(productId, change) {
    if (window.cartSystem) {
        window.cartSystem.updateQuantity(productId, change);
    }
};

window.removeFromCart = function(productId) {
    if (window.cartSystem) {
        window.cartSystem.removeFromCart(productId);
    }
};