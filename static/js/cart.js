// cart.js - отдельный файл корзины
class CartSystem {
    constructor() {
        this.cart = dataManager.getCart();
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCartUI();
    }
    
    bindEvents() {
        const cartIcon = document.getElementById('cartIcon');
        const cartClose = document.getElementById('cartClose');
        const continueShoppingBtn = document.getElementById('continueShoppingBtn');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartIcon) cartIcon.addEventListener('click', () => this.openCart());
        if (cartClose) cartClose.addEventListener('click', () => this.closeCart());
        if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', () => this.closeCart());
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.checkout());
        if (cartOverlay) {
            cartOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this.closeCart();
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('cartOverlay')?.classList.contains('active')) {
                this.closeCart();
            }
        });
    }
    
    openCart() {
        const overlay = document.getElementById('cartOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.renderCart();
        }
    }
    
    closeCart() {
        const overlay = document.getElementById('cartOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    addToCart(product) {
        // Проверяем, есть ли такой товар уже в корзине
        const existingItem = this.cart.find(item => item.id == product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || product.image || '',
                quantity: 1,
                original_product_id: product.original_product_id || product.id,
                color_name: product.color_name || ''
            });
        }
        
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.showAddToCartAnimation();
        this.showNotification(`"${product.name}" добавлен в корзину`, 'success');
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id != productId);
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.renderCart();
        this.showNotification('Товар удален из корзины', 'success');
    }
    
    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id == productId);
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
    }
    
    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const cartIcon = document.getElementById('cartIcon');
        
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
        }
        
        if (document.getElementById('cartOverlay')?.classList.contains('active')) {
            this.renderCart();
        }
    }
    
    renderCart() {
        const cartItems = document.getElementById('cartItems');
        const cartEmpty = document.getElementById('cartEmpty');
        const cartFooter = document.getElementById('cartFooter');
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        
        if (!cartItems || !cartEmpty || !cartFooter) return;
        
        if (this.cart.length === 0) {
            cartItems.style.display = 'none';
            cartEmpty.style.display = 'block';
            cartFooter.style.display = 'none';
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
            
            // Используем строковые ID для обработчиков onclick
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
                                <button class="quantity-btn decrease-btn" onclick="window.cartSystem.updateQuantity('${item.id}', -1)">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" 
                                       onchange="window.cartSystem.updateQuantity('${item.id}', parseInt(this.value) - ${item.quantity})">
                                <button class="quantity-btn increase-btn" onclick="window.cartSystem.updateQuantity('${item.id}', 1)">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button class="remove-item" onclick="window.cartSystem.removeFromCart('${item.id}')">
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
        }
        
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = this.cart.length === 0;
        }
    }
    
    async checkout() {
        if (this.cart.length === 0) {
            this.showNotification('Корзина пуста', 'error');
            return;
        }
        
        this.openCheckoutModal();
    }
    
    openCheckoutModal() {
        this.createCheckoutModal();
        this.renderCheckoutOrderSummary();
        
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const nameInput = document.getElementById('customerName');
                if (nameInput) nameInput.focus();
            }, 300);
        }
    }
    
    createCheckoutModal() {
        if (document.getElementById('checkoutModal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'checkoutModal';
        modal.className = 'checkout-modal';
        modal.innerHTML = `
            <div class="checkout-modal-content">
                <div class="checkout-modal-header">
                    <h3>Оформление заказа</h3>
                    <button class="checkout-modal-close" id="checkoutModalClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="checkout-modal-body">
                    <form id="checkoutForm">
                        <div class="form-group">
                            <label for="customerName">ФИО *</label>
                            <input type="text" id="customerName" name="customerName" required 
                                   placeholder="Иванов Иван Иванович">
                        </div>
                        <div class="form-group">
                            <label for="customerPhone">Телефон *</label>
                            <input type="tel" id="customerPhone" name="customerPhone" required 
                                   placeholder="+7 (900) 123-45-67">
                        </div>
                        <div class="form-group">
                            <label for="customerEmail">Email</label>
                            <input type="email" id="customerEmail" name="customerEmail" 
                                   placeholder="ivanov@example.com">
                        </div>
                        <div class="form-group">
                            <label for="customerAddress">Адрес доставки</label>
                            <textarea id="customerAddress" name="customerAddress" 
                                      placeholder="Город, улица, дом, квартира" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="customerComment">Комментарий к заказу</label>
                            <textarea id="customerComment" name="customerComment" 
                                      placeholder="Дополнительные пожелания" rows="3"></textarea>
                        </div>
                        
                        <div class="order-summary">
                            <h4>Состав заказа:</h4>
                            <div id="checkoutOrderItems"></div>
                            <div class="order-total">
                                <strong>Итого: <span id="checkoutTotalAmount">0 ₽</span></strong>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="checkout-modal-footer">
                    <button type="button" class="btn btn-outline" id="checkoutModalCancel">
                        Отмена
                    </button>
                    <button type="submit" form="checkoutForm" class="btn btn-primary" id="checkoutSubmitBtn">
                        <i class="fas fa-paper-plane"></i>
                        Отправить заказ
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики событий
        const closeBtn = document.getElementById('checkoutModalClose');
        const cancelBtn = document.getElementById('checkoutModalCancel');
        const form = document.getElementById('checkoutForm');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeCheckoutModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeCheckoutModal());
        if (form) form.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeCheckoutModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeCheckoutModal();
            }
        });
    }
    
    closeCheckoutModal() {
        const modal = document.getElementById('checkoutModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    renderCheckoutOrderSummary() {
        const itemsContainer = document.getElementById('checkoutOrderItems');
        const totalAmount = document.getElementById('checkoutTotalAmount');
        
        if (!itemsContainer || !totalAmount) return;
        
        let itemsHTML = '';
        let total = 0;
        
        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            itemsHTML += `
                <div class="checkout-order-item">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">${item.quantity} шт.</span>
                    <span class="item-price">${dataManager.formatPrice(itemTotal)}</span>
                </div>
            `;
        });
        
        itemsContainer.innerHTML = itemsHTML;
        totalAmount.textContent = dataManager.formatPrice(total);
    }
    
    async handleCheckoutSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        const orderData = {
            customer_name: formData.get('customerName'),
            customer_phone: formData.get('customerPhone'),
            customer_email: formData.get('customerEmail') || '',
            customer_address: formData.get('customerAddress') || '',
            customer_comment: formData.get('customerComment') || '',
            items: this.cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            total: this.getCartTotal()
        };
        
        // Валидация
        if (!orderData.customer_name || !orderData.customer_phone) {
            this.showNotification('Пожалуйста, заполните обязательные поля (ФИО и телефон)', 'error');
            return;
        }
        
        const submitBtn = document.getElementById('checkoutSubmitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;
        
        try {
            const result = await dataManager.submitOrder(orderData);
            
            if (result.success) {
                this.showNotification('Заказ успешно отправлен! Мы свяжемся с вами.', 'success');
                this.closeCheckoutModal();
                this.clearCart();
            } else {
                this.showNotification(`Ошибка: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            this.showNotification('Произошла ошибка при отправке заказа', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    clearCart() {
        this.cart = [];
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.renderCart();
    }
    
    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    showAddToCartAnimation() {
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.classList.add('animate');
            setTimeout(() => cartIcon.classList.remove('animate'), 500);
        }
    }
    
    showNotification(message, type = 'success') {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.cart-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <div class="cart-notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Стили для уведомлений корзины
const cartNotificationStyles = document.createElement('style');
cartNotificationStyles.textContent = `
    .cart-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(120%);
        transition: transform 0.3s ease;
        z-index: 9999;
        max-width: 400px;
    }
    
    .cart-notification.show {
        transform: translateX(0);
    }
    
    .cart-notification.success {
        background: #27ae60;
        color: white;
        border-left: 4px solid #219653;
    }
    
    .cart-notification.error {
        background: #e74c3c;
        color: white;
        border-left: 4px solid #c0392b;
    }
    
    .cart-notification.warning {
        background: #f39c12;
        color: white;
        border-left: 4px solid #d35400;
    }
    
    .cart-notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .cart-notification-content i {
        font-size: 1.2rem;
    }
`;
document.head.appendChild(cartNotificationStyles);

// Экспортируем глобально
window.CartSystem = CartSystem;