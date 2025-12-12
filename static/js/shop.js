document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('MA Furniture Shop инициализируется...');
    
    await initializeProducts();
    initializeCart();
    initializeMobileMenu();
    
    // Событие обновления данных
    window.addEventListener('productsDataUpdated', async () => {
        console.log('Shop: Данные обновлены');
        await initializeProducts();
    });
}

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
        showNotification(`"${product.name}" добавлен в корзину`, 'success');
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        dataManager.saveCart(this.cart);
        this.updateCartUI();
        this.renderCart();
        showNotification('Товар удален из корзины', 'success');
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
            showNotification('Максимум 99 шт.', 'error');
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
                                <button class="quantity-btn decrease-btn" onclick="cartSystem.updateQuantity(${item.id}, -1)">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" 
                                       onchange="cartSystem.updateQuantity(${item.id}, parseInt(this.value) - ${item.quantity})">
                                <button class="quantity-btn increase-btn" onclick="cartSystem.updateQuantity(${item.id}, 1)">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button class="remove-item" onclick="cartSystem.removeFromCart(${item.id})">
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
            showNotification('Корзина пуста', 'error');
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
            items: this.cart,
            total: this.getCartTotal()
        };
        
        // Валидация
        if (!orderData.customer_name || !orderData.customer_phone) {
            showNotification('Пожалуйста, заполните обязательные поля (ФИО и телефон)', 'error');
            return;
        }
        
        const submitBtn = document.getElementById('checkoutSubmitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;
        
        try {
            const result = await dataManager.submitOrder(orderData);
            
            if (result.success) {
                showNotification('Заказ успешно отправлен! Мы свяжемся с вами.', 'success');
                this.closeCheckoutModal();
                this.clearCart();
            } else {
                showNotification(`Ошибка: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            showNotification('Произошла ошибка при отправке заказа', 'error');
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
}

let cartSystem;

function initializeCart() {
    cartSystem = new CartSystem();
    console.log('Корзина инициализирована');
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ДЛЯ ТОВАРОВ ==========
async function initializeProducts() {
    console.log('MA Furniture Shop - загрузка товаров с сервера...');
    const productsGrid = document.getElementById('productsGrid');
    const pagination = document.getElementById('pagination');
    const itemsPerPage = 15;
    let currentPage = 1;
    let currentFilter = 'all';

    async function renderProducts() {
        try {
            console.log('Запрос активных товаров...');
            const activeProducts = await dataManager.getActiveProducts();
            console.log(`Получено товаров: ${activeProducts.length}`);
            
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            
            let filteredProducts = activeProducts;
            if (currentFilter !== 'all') {
                filteredProducts = activeProducts.filter(product => 
                    product.section === currentFilter
                );
            }
            
            const productsToShow = filteredProducts.slice(startIndex, endIndex);
            
            if (productsGrid) {
                productsGrid.innerHTML = '';
                
                if (productsToShow.length === 0) {
                    productsGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                            <h3>${activeProducts.length === 0 ? 'Нет активных товаров' : 'Нет товаров в выбранном разделе'}</h3>
                            <p>${activeProducts.length === 0 ? 'Добавьте товары через админ-панель' : 'Попробуйте выбрать другой раздел'}</p>
                        </div>
                    `;
                    if (pagination) pagination.innerHTML = '';
                    return;
                }
                
                console.log(`Отображение ${productsToShow.length} товаров`);
                productsToShow.forEach(product => {
                    const productCard = createProductCard(product);
                    productsGrid.appendChild(productCard);
                });
            }
            
            if (pagination) {
                renderPagination(filteredProducts.length);
            }
            attachProductEventListeners();
            
        } catch (error) {
            console.error('Критическая ошибка рендеринга товаров:', error);
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3>Ошибка загрузки товаров</h3>
                        <p>Попробуйте обновить страницу или проверьте подключение к интернету</p>
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                            Обновить страницу
                        </button>
                    </div>
                `;
            }
        }
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.section = product.section || 'all';
        
        // Бейдж
        let badgeClass = '';
        if (product.badge) {
            switch(product.badge.toLowerCase()) {
                case 'хит продаж':
                case 'хит':
                    badgeClass = 'hit';
                    break;
                case 'новинка':
                case 'new':
                    badgeClass = 'new';
                    break;
                case 'акция':
                case 'sale':
                    badgeClass = 'sale';
                    break;
                case 'эксклюзив':
                case 'exclusive':
                    badgeClass = 'exclusive';
                    break;
                case 'премиум':
                case 'premium':
                    badgeClass = 'premium';
                    break;
                default:
                    badgeClass = 'new';
            }
        }
        
        const badge = product.badge ? 
            `<div class="product-badge ${badgeClass}">${product.badge}</div>` : '';
        
        // Изображение
        let imageContent = '';
        if (product.images && product.images.length > 0) {
            imageContent = `<img src="${product.images[0]}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        
        const productUrl = `piece.html?id=${product.id}`;
        
        card.innerHTML = `
            <div class="product-image">
                ${imageContent}
                <div class="image-placeholder" style="${product.images && product.images.length > 0 ? 'display: none;' : 'display: flex;'}">
                    <i class="fas fa-couch"></i>
                </div>
                ${badge}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-description">
                    ${product.description?.substring(0, 150) || 'Качественный товар от MA Furniture'}...
                </div>
                <div class="product-price">
                    <span class="current-price">${dataManager.formatPrice(product.price)}</span>
                    ${product.old_price ? 
                        `<span class="old-price" style="text-decoration: line-through; color: #999; margin-left: 10px;">
                            ${dataManager.formatPrice(product.old_price)}
                        </span>` : ''
                    }
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i>
                        В корзину
                    </button>
                </div>
            </div>
            <a href="${productUrl}" class="product-link-overlay"></a>
        `;
        
        return card;
    }

    function renderPagination(totalItems) {
        const totalFilteredPages = Math.ceil(totalItems / itemsPerPage);
        
        if (pagination) {
            pagination.innerHTML = '';
            
            if (totalFilteredPages <= 1) return;
            
            const prevBtn = document.createElement('button');
            prevBtn.className = `page-btn ${currentPage === 1 ? 'disabled' : ''}`;
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderProducts();
                }
            });
            pagination.appendChild(prevBtn);
            
            for (let i = 1; i <= totalFilteredPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    renderProducts();
                });
                pagination.appendChild(pageBtn);
            }
            
            const nextBtn = document.createElement('button');
            nextBtn.className = `page-btn ${currentPage === totalFilteredPages ? 'disabled' : ''}`;
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalFilteredPages) {
                    currentPage++;
                    renderProducts();
                }
            });
            pagination.appendChild(nextBtn);
        }
    }

    function attachProductEventListeners() {
        // Обработчик для кнопки "В корзину"
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const productId = parseInt(e.target.closest('.add-to-cart-btn').dataset.productId);
                const product = await dataManager.getProductById(productId);
                if (product && cartSystem) {
                    cartSystem.addToCart(product);
                }
            });
        });
        
        // Обработчик для всей карточки
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.add-to-cart-btn')) {
                    return;
                }
                
                const link = card.querySelector('.product-link-overlay');
                if (link) {
                    window.location.href = link.href;
                }
            });
        });
    }

    async function loadSectionsFromAdmin() {
        try {
            const sections = await dataManager.getActiveSections();
            return sections;
        } catch (error) {
            console.error('Ошибка загрузки разделов:', error);
            return [];
        }
    }

    async function initializeFilters() {
        const catalogFilters = document.getElementById('catalogFilters');
        const footerSections = document.getElementById('footerSections');
        
        if (!catalogFilters || !footerSections) return;
        
        try {
            const sections = await loadSectionsFromAdmin();
            
            // Очищаем контейнеры
            catalogFilters.innerHTML = '<button class="filter-btn active" data-filter="all">Все товары</button>';
            footerSections.innerHTML = '';
            
            // Обработчик для "Все товары"
            const allFilterBtn = catalogFilters.querySelector('[data-filter="all"]');
            allFilterBtn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                allFilterBtn.classList.add('active');
                
                currentFilter = 'all';
                currentPage = 1;
                renderProducts();
            });
            
            // Добавляем фильтры для разделов
            sections.forEach(section => {
                // Фильтры в каталоге
                const filterBtn = document.createElement('button');
                filterBtn.className = 'filter-btn';
                filterBtn.dataset.filter = section.code;
                filterBtn.textContent = section.name;
                filterBtn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    filterBtn.classList.add('active');
                    
                    currentFilter = section.code;
                    currentPage = 1;
                    renderProducts();
                });
                catalogFilters.appendChild(filterBtn);
                
                // Ссылки в футере
                const footerLink = document.createElement('li');
                const link = document.createElement('a');
                link.href = `shop.html?section=${section.code}`;
                link.textContent = section.name;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filterBtn = document.querySelector(`[data-filter="${section.code}"]`);
                    if (filterBtn) {
                        filterBtn.click();
                        window.scrollTo({ top: document.getElementById('catalog').offsetTop - 100, behavior: 'smooth' });
                    }
                });
                footerLink.appendChild(link);
                footerSections.appendChild(footerLink);
            });
            
        } catch (error) {
            console.error('Ошибка инициализации фильтров:', error);
        }
    }

    function handleUrlFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        
        if (section) {
            const filterBtn = document.querySelector(`[data-filter="${section}"]`);
            if (filterBtn) {
                filterBtn.click();
            }
        } else {
            const allFilterBtn = document.querySelector('[data-filter="all"]');
            if (allFilterBtn) {
                allFilterBtn.classList.add('active');
                currentFilter = 'all';
            }
        }
    }

    await initializeFilters();
    await renderProducts();
    handleUrlFilters();
}

function initializeMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }
    
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav) mainNav.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        });
    });
}

function showNotification(message, type = 'success') {
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
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function loadShopBackground() {
    try {
        const response = await fetch(`${window.location.origin}/api/media/background`);
        const data = await response.json();
        
        if (data.success && data.background && data.background.image_url && data.background.active) {
            const heroBackground = document.getElementById('shopHeroBackground');
            if (heroBackground) {
                const img = new Image();
                img.src = data.background.image_url;
                img.onload = function() {
                    heroBackground.style.backgroundImage = `url('${data.background.image_url}')`;
                    heroBackground.style.backgroundSize = 'cover';
                    heroBackground.style.backgroundPosition = 'center';
                    heroBackground.style.backgroundRepeat = 'no-repeat';
                };
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки фона для shop:', error);
    }
}

// Вызывать при загрузке страницы shop
if (window.location.pathname.includes('shop.html')) {
    loadShopBackground();
}

// Глобальные экспорты
window.cartSystem = cartSystem;
window.showNotification = showNotification;
window.dataManager = dataManager;