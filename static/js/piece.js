document.addEventListener('DOMContentLoaded', function() {
    initializeProductPage();
    initializeCart();
    initializeMobileMenu();
});

function initializeProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    if (!productId) {
        showError('Товар не найден');
        return;
    }
    
    loadProduct(productId);
    loadRelatedProducts(productId);
}

function loadProduct(productId) {
    const product = dataManager.getProductById(productId);
    
    if (!product) {
        showError('Товар не найден');
        return;
    }
    
    renderProductDetails(product);
}

function renderProductDetails(product) {
    const container = document.getElementById('productDetails');
    
    const colorVariants = dataManager.getColorVariants(product.id);
    const hasColorVariants = colorVariants.length > 0;
    
    const specsHtml = product.specifications && Object.keys(product.specifications).length > 0 ? 
        Object.entries(product.specifications).map(([key, value]) => `
            <div class="spec-row">
                <span class="spec-key">${key}:</span>
                <span class="spec-value">${value}</span>
            </div>
        `).join('') : 
        '<div class="spec-row">Информация отсутствует</div>';
    
    const featuresHtml = product.features && product.features.length > 0 ? 
        product.features.map(feature => `<li>${feature}</li>`).join('') : 
        '<li>Информация отсутствует</li>';
    
    let galleryHtml = '';
    if (product.images && product.images.length > 0) {
        galleryHtml = `
            <div class="product-gallery">
                <div class="gallery-main">
                    ${product.images.map((img, index) => `
                        <div class="gallery-slide ${index === 0 ? 'active' : ''}">
                            <img src="${img}" alt="${product.name} - изображение ${index + 1}">
                        </div>
                    `).join('')}
                </div>
                ${product.images.length > 1 ? `
                    <div class="gallery-thumbs">
                        ${product.images.map((img, index) => `
                            <div class="thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <img src="${img}" alt="${product.name} - миниатюра ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        galleryHtml = `
            <div class="product-gallery">
                <div class="gallery-main">
                    <div class="gallery-slide active">
                        <div style="width: 100%; height: 400px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                            ${product.name}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    let colorSelectorHtml = '';
    if (hasColorVariants) {
        const mainProductColor = {
            id: product.id,
            name: 'Основной',
            hex: product.colorHex || '#cccccc',
            images: product.images || []
        };
        
        const allColorOptions = [mainProductColor, ...colorVariants];
        
        colorSelectorHtml = `
            <div class="color-selector">
                <h4>Выберите цвет:</h4>
                <div class="color-options">
                    ${allColorOptions.map((colorOption, index) => `
                        <div class="color-option ${index === 0 ? 'active' : ''}" 
                             data-product-id="${colorOption.id}" 
                             data-color-hex="${colorOption.hex}">
                            <div class="color-sample" style="background-color: ${colorOption.hex}; 
                                 ${colorOption.hex === '#ffffff' ? 'border: 1px solid #ddd;' : ''}">
                                ${colorOption.hex === '#ffffff' ? '<div style="color: #666; font-size: 0.6rem;">Цвет</div>' : ''}
                            </div>
                            <span>${colorOption.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="product-layout">
            ${galleryHtml}
            
            <div class="product-info">
                <div class="product-header">
                    <h1>${product.name}</h1>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                </div>
                
                <div class="product-price">
                    <span class="current-price">${formatPrice(product.price)}</span>
                </div>
                
                ${colorSelectorHtml}
                
                <div class="product-meta">
                    <div class="meta-item">
                        <span class="meta-label">Артикул:</span>
                        <span class="meta-value">${product.sku || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Наличие:</span>
                        <span class="meta-value ${(product.stock || 0) > 0 ? 'in-stock' : 'out-of-stock'}">
                            ${(product.stock || 0) > 0 ? 'В наличии' : 'Нет в наличии'}
                        </span>
                    </div>
                </div>
                
                <div class="product-description">
                    <p>${product.description || 'Описание товара отсутствует.'}</p>
                </div>
                
                <div class="product-features">
                    <h3>Особенности:</h3>
                    <ul>${featuresHtml}</ul>
                </div>
                
                <div class="product-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn minus">-</button>
                        <input type="number" class="quantity-input" value="1" min="1" max="${product.stock || 1}">
                        <button class="quantity-btn plus">+</button>
                    </div>
                    <button class="btn btn-primary btn-add-to-cart" 
                            ${(product.stock || 0) <= 0 ? 'disabled' : ''}
                            data-product="${product.id}">
                        <i class="fas fa-shopping-cart"></i>
                        ${(product.stock || 0) > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
                    </button>
                    <button class="btn btn-outline btn-wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                
                <div class="product-specifications">
                    <h3>Характеристики:</h3>
                    <div class="specs-list">${specsHtml}</div>
                </div>
            </div>
        </div>
    `;
    
    initializeGallery();
    initializeProductEventListeners(product);
    
    if (hasColorVariants) {
        initializeColorSelector(product.id, colorVariants);
    }
}

function initializeColorSelector(mainProductId, variants) {
    const colorOptions = document.querySelectorAll('.color-option');
    let currentProductId = mainProductId;
    
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedProductId = parseInt(option.dataset.productId);
            
            if (selectedProductId === currentProductId) return;
            
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            currentProductId = selectedProductId;
            
            if (selectedProductId !== mainProductId) {
                const selectedVariant = variants.find(v => v.id === selectedProductId);
                if (selectedVariant) {
                    updateProductDisplay(selectedVariant);
                }
            } else {
                const mainProduct = dataManager.getProductById(mainProductId);
                updateProductDisplay(mainProduct);
            }
        });
    });
}

function updateProductDisplay(product) {
    const titleElement = document.querySelector('.product-header h1');
    if (titleElement) {
        titleElement.textContent = product.name;
    }
    
    const priceElement = document.querySelector('.product-price .current-price');
    if (priceElement) {
        priceElement.textContent = formatPrice(product.price);
    }
    
    const skuElement = document.querySelector('.meta-item .meta-value');
    if (skuElement && product.sku) {
        skuElement.textContent = product.sku;
    }
    
    const stockElement = document.querySelector('.meta-item .meta-value');
    if (stockElement) {
        const isInStock = (product.stock || 0) > 0;
        stockElement.className = `meta-value ${isInStock ? 'in-stock' : 'out-of-stock'}`;
        stockElement.textContent = isInStock ? 'В наличии' : 'Нет в наличии';
    }
    
    const descriptionElement = document.querySelector('.product-description p');
    if (descriptionElement && product.description) {
        descriptionElement.textContent = product.description;
    }
    
    const featuresElement = document.querySelector('.product-features ul');
    if (featuresElement && product.features) {
        const featuresHtml = product.features && product.features.length > 0 ? 
            product.features.map(feature => `<li>${feature}</li>`).join('') : 
            '<li>Информация отсутствует</li>';
        featuresElement.innerHTML = featuresHtml;
    }
    
    const specsElement = document.querySelector('.specs-list');
    if (specsElement && product.specifications) {
        const specsHtml = product.specifications && Object.keys(product.specifications).length > 0 ? 
            Object.entries(product.specifications).map(([key, value]) => `
                <div class="spec-row">
                    <span class="spec-key">${key}:</span>
                    <span class="spec-value">${value}</span>
                </div>
            `).join('') : 
            '<div class="spec-row">Информация отсутствует</div>';
        specsElement.innerHTML = specsHtml;
    }
    
    const addToCartBtn = document.querySelector('.btn-add-to-cart');
    if (addToCartBtn) {
        const isInStock = (product.stock || 0) > 0;
        addToCartBtn.disabled = !isInStock;
        addToCartBtn.dataset.product = product.id;
        addToCartBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> ${isInStock ? 'Добавить в корзину' : 'Нет в наличии'}`;
    }
    
    const quantityInput = document.querySelector('.quantity-input');
    if (quantityInput) {
        quantityInput.max = product.stock || 1;
        if (parseInt(quantityInput.value) > (product.stock || 1)) {
            quantityInput.value = product.stock || 1;
        }
    }
    
    updateProductGallery(product.images);
}

function updateProductGallery(images) {
    const galleryMain = document.querySelector('.gallery-main');
    const galleryThumbs = document.querySelector('.gallery-thumbs');
    
    if (galleryMain) {
        if (images && images.length > 0) {
            galleryMain.innerHTML = images.map((img, index) => `
                <div class="gallery-slide ${index === 0 ? 'active' : ''}">
                    <img src="${img}" alt="${document.querySelector('.product-header h1')?.textContent || 'Товар'}">
                </div>
            `).join('');
            
            if (galleryThumbs && images.length > 1) {
                galleryThumbs.innerHTML = images.map((img, index) => `
                    <div class="thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img src="${img}" alt="${document.querySelector('.product-header h1')?.textContent || 'Товар'}">
                    </div>
                `).join('');
                
                initializeGallery();
            } else if (galleryThumbs) {
                galleryThumbs.innerHTML = '';
            }
        } else {
            galleryMain.innerHTML = `
                <div class="gallery-slide active">
                    <div style="width: 100%; height: 400px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                        ${document.querySelector('.product-header h1')?.textContent || 'Товар'}
                    </div>
                </div>
            `;
            if (galleryThumbs) {
                galleryThumbs.innerHTML = '';
            }
        }
    }
}

function getColorHex(colorIndex) {
    const colors = {
        1: 'FF6B6B',
        2: '4ECDC4',
        3: '45B7D1',
        4: '96CEB4',
        5: 'FFEAA7'
    };
    return colors[colorIndex] || 'CCCCCC';
}

function initializeGallery() {
    const thumbs = document.querySelectorAll('.gallery-thumbs .thumb');
    const slides = document.querySelectorAll('.gallery-slide');
    
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const index = parseInt(thumb.dataset.index);
            
            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            
            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
        });
    });
}

function initializeProductEventListeners(product) {
    const quantityInput = document.querySelector('.quantity-input');
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    
    if (minusBtn && plusBtn && quantityInput) {
        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
        
        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            const maxStock = product.stock || 1;
            if (currentValue < maxStock) {
                quantityInput.value = currentValue + 1;
            }
        });
    }
    
    const addToCartBtn = document.querySelector('.btn-add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const quantity = parseInt(document.querySelector('.quantity-input')?.value || 1);
            const currentProductId = parseInt(addToCartBtn.dataset.product);
            addToCart(currentProductId, quantity);
        });
    }
    
    const wishlistBtn = document.querySelector('.btn-wishlist');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
            wishlistBtn.classList.toggle('active');
            const icon = wishlistBtn.querySelector('i');
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            
            if (wishlistBtn.classList.contains('active')) {
                wishlistBtn.style.color = '#d4af37';
                showNotification('Товар добавлен в избранное');
            } else {
                wishlistBtn.style.color = '';
                showNotification('Товар удален из избранного');
            }
        });
    }
}

function loadRelatedProducts(currentProductId) {
    const products = dataManager.getActiveProducts();
    const currentProduct = products.find(p => p.id === currentProductId);
    
    if (!currentProduct) return;
    
    const relatedProducts = products
        .filter(p => p.id !== currentProductId && 
                    !p.isColorVariant &&
                    p.category === currentProduct.category && 
                    p.active === true)
        .slice(0, 4);
    
    renderRelatedProducts(relatedProducts);
}

function renderRelatedProducts(products) {
    const container = document.getElementById('relatedProducts');
    
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                <p>Нет сопутствующих товаров</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const badge = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';
        
        let imageContent = '';
        if (product.images && product.images.length > 0) {
            imageContent = `<img src="${product.images[0]}" alt="${product.name}" loading="lazy">`;
        } else {
            imageContent = `
                <div style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666; font-size: 0.9rem;">
                    ${product.name}
                </div>
            `;
        }
        
        return `
            <div class="product-card">
                <div class="product-image">
                    ${imageContent}
                    ${badge}
                    <button class="quick-view" data-product="${product.id}">Быстрый просмотр</button>
                    <a href="piece.html?id=${product.id}" class="product-link"></a>
                </div>
                <div class="product-info">
                    <h3 class="product-title">
                        <a href="piece.html?id=${product.id}">${product.name}</a>
                    </h3>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(product.price)}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-cart" data-product="${product.id}">В корзину</button>
                        <button class="btn-wishlist">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    attachRelatedProductsEventListeners();
}

function attachRelatedProductsEventListeners() {
    document.querySelectorAll('#relatedProducts .btn-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.product);
            addToCart(productId);
            showNotification('Товар добавлен в корзину');
        });
    });
    
    document.querySelectorAll('#relatedProducts .btn-wishlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const icon = e.target.querySelector('i') || e.target;
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            
            if (icon.classList.contains('fas')) {
                icon.style.color = '#d4af37';
                showNotification('Товар добавлен в избранное');
            } else {
                icon.style.color = '';
                showNotification('Товар удален из избранного');
            }
        });
    });
    
    document.querySelectorAll('#relatedProducts .quick-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.product);
            showProductModal(productId);
        });
    });
}

function showError(message) {
    const container = document.getElementById('productDetails');
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
            <h2>${message}</h2>
            <p>Попробуйте вернуться в <a href="shop.html">магазин</a> и выбрать другой товар.</p>
        </div>
    `;
}

// НОВАЯ СИСТЕМА КОРЗИНЫ ДЛЯ PIECE.HTML
class PieceCartSystem {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('ma_furniture_cart')) || [];
        this.checkoutModal = null;
        this.isCheckoutModalOpen = false;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCartUI();
    }
    
    bindEvents() {
        const cartBtn = document.getElementById('cartBtn');
        const cartClose = document.getElementById('closeCart');
        const checkoutBtn = document.querySelector('.btn-checkout');
        
        if (cartBtn) {
            cartBtn.addEventListener('click', () => this.openCart());
        }
        
        if (cartClose) {
            cartClose.addEventListener('click', () => this.closeCart());
        }
        
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }
        
        document.addEventListener('click', (e) => {
            const cartSidebar = document.getElementById('cartSidebar');
            const cartBtn = document.getElementById('cartBtn');
            
            if (cartSidebar && cartSidebar.classList.contains('active') && 
                !cartSidebar.contains(e.target) && 
                !cartBtn.contains(e.target)) {
                this.closeCart();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('cartSidebar')?.classList.contains('active')) {
                this.closeCart();
            }
        });
    }
    
    openCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            this.renderCart();
        }
    }
    
    closeCart() {
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
    }
    
    addToCart(productId, quantity = 1) {
        const product = dataManager.getProductById(productId);
        
        if (!product) {
            this.showNotification('Товар не найден', 'error');
            return;
        }
        
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || '',
                quantity: quantity
            });
        }
        
        this.saveCart();
        this.updateCartUI();
        this.showAddToCartAnimation();
        this.showNotification(`"${product.name}" добавлен в корзину`, 'success');
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartUI();
        this.renderCart();
        this.showNotification('Товар удален из корзины', 'success');
    }
    
    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity += change;
            
            if (item.quantity < 1) {
                this.removeFromCart(productId);
                return;
            }
            
            if (item.quantity > 99) {
                item.quantity = 99;
                this.showNotification('Максимум 99 шт.', 'error');
            }
            
            this.saveCart();
            this.updateCartUI();
            this.renderCart();
        }
    }
    
    saveCart() {
        try {
            const cartToSave = this.cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                quantity: item.quantity
            }));
            
            localStorage.setItem('ma_furniture_cart', JSON.stringify(cartToSave));
        } catch (error) {
            console.error('Ошибка сохранения корзины:', error);
            if (error.name === 'QuotaExceededError') {
                localStorage.clear();
                localStorage.setItem('ma_furniture_cart', JSON.stringify(this.cart));
            }
        }
    }
    
    updateCartUI() {
        const cartCount = document.querySelector('.cart-count');
        const cartTotal = document.getElementById('cartTotal');
        
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            
            if (totalItems > 0) {
                cartCount.style.display = 'flex';
            } else {
                cartCount.style.display = 'none';
            }
        }
        
        if (cartTotal) {
            const totalPrice = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cartTotal.textContent = formatPrice(totalPrice);
        }
    }
    
    renderCart() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (!cartItems) return;
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Ваша корзина пуста</p>
                </div>
            `;
            return;
        }
        
        let itemsHTML = '';
        let total = 0;
        
        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const imageHTML = item.image ? 
                `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';">` :
                '<div class="no-image"><i class="fas fa-couch"></i></div>';
            
            itemsHTML += `
                <div class="cart-item">
                    <div class="cart-item-image">
                        ${imageHTML}
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <div class="cart-item-price">${formatPrice(item.price)}</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn minus" onclick="pieceCartSystem.updateQuantity(${item.id}, -1)">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn plus" onclick="pieceCartSystem.updateQuantity(${item.id}, 1)">+</button>
                            <button class="remove-btn" onclick="pieceCartSystem.removeFromCart(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cartItems.innerHTML = itemsHTML;
        
        if (cartTotal) {
            cartTotal.textContent = formatPrice(total);
        }
    }

    createCheckoutModal() {
        if (this.checkoutModal) return;
        
        const modal = document.createElement('div');
        modal.className = 'checkout-modal';
        modal.id = 'checkoutModal';
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
        this.checkoutModal = modal;
        this.bindCheckoutModalEvents();
    }

    bindCheckoutModalEvents() {
        const closeBtn = document.getElementById('checkoutModalClose');
        const cancelBtn = document.getElementById('checkoutModalCancel');
        const form = document.getElementById('checkoutForm');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeCheckoutModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeCheckoutModal());
        }
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
        }
        
        this.checkoutModal.addEventListener('click', (e) => {
            if (e.target === this.checkoutModal) {
                this.closeCheckoutModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isCheckoutModalOpen) {
                this.closeCheckoutModal();
            }
        });
    }

    openCheckoutModal() {
        if (!this.checkoutModal) {
            this.createCheckoutModal();
        }
        
        this.renderCheckoutOrderSummary();
        this.checkoutModal.classList.add('active');
        this.isCheckoutModalOpen = true;
        document.body.style.overflow = 'hidden';
        
        const nameInput = document.getElementById('customerName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 300);
        }
    }

    closeCheckoutModal() {
        if (this.checkoutModal) {
            this.checkoutModal.classList.remove('active');
            this.isCheckoutModalOpen = false;
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
                    <span class="item-price">${this.formatPrice(itemTotal)}</span>
                </div>
            `;
        });
        
        itemsContainer.innerHTML = itemsHTML;
        totalAmount.textContent = this.formatPrice(total);
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
            total: this.getCartTotal(),
            order_date: new Date().toISOString()
        };
        
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
                if (result.telegram_sent) {
                    this.showNotification('Заказ успешно отправлен! Мы свяжемся с вами в ближайшее время.', 'success');
                } else if (result.fallback_used) {
                    this.showNotificationWithAction(
                        result.message,
                        'info',
                        'Отправить через Telegram',
                        () => {
                            const telegramResult = dataManager.openTelegramFallback(orderData);
                            if (telegramResult.success) {
                                this.showNotification('Заказ открыт в Telegram для отправки', 'success');
                                this.closeCheckoutModal();
                                this.clearCart();
                            }
                        }
                    );
                    return;
                }
                
                this.closeCheckoutModal();
                this.clearCart();
            } else {
                if (result.fallback_available) {
                    this.showNotificationWithAction(
                        result.error,
                        'error',
                        'Отправить через Telegram',
                        () => {
                            const telegramResult = dataManager.openTelegramFallback(orderData);
                            if (telegramResult.success) {
                                this.showNotification('Заказ открыт в Telegram для отправки', 'success');
                                this.closeCheckoutModal();
                                this.clearCart();
                            }
                        }
                    );
                } else {
                    throw new Error(result.error || 'Ошибка отправки заказа');
                }
            }
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            this.showNotification('Произошла ошибка при отправке заказа. Попробуйте еще раз.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    checkout() {
        if (this.cart.length === 0) {
            this.showNotification('Корзина пуста', 'error');
            return;
        }
        
        this.openCheckoutModal();
    }
    
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartUI();
        this.renderCart();
    }
    
    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    showAddToCartAnimation() {
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.classList.add('animate');
            setTimeout(() => cartBtn.classList.remove('animate'), 500);
        }
    }
    
    showNotification(message, type = 'success') {
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

    showNotificationWithAction(message, type, actionText, actionCallback) {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} with-action`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                ${message}
                <button class="notification-action-btn">${actionText}</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        const actionBtn = notification.querySelector('.notification-action-btn');
        actionBtn.addEventListener('click', () => {
            actionCallback();
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
    }
    
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }
}

let pieceCartSystem;

function initializeCart() {
    pieceCartSystem = new PieceCartSystem();
    console.log('Piece cart system initialized');
    
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            pieceCartSystem.checkout();
        });
    }
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'ma_furniture_cart') {
            console.log('Piece: Обновление корзины из другого окна');
            if (pieceCartSystem) {
                pieceCartSystem.cart = JSON.parse(e.newValue) || [];
                pieceCartSystem.updateCartUI();
                pieceCartSystem.renderCart();
            }
        }
    });
}

function addToCart(productId, quantity = 1) {
    if (pieceCartSystem) {
        pieceCartSystem.addToCart(productId, quantity);
    }
}

function initializeMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = document.getElementById('closeMenu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });
    }
    
    if (closeMenu && mobileMenu) {
        closeMenu.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    }
    
    const cartToggle = document.getElementById('cartToggle');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    
    if (cartToggle && cartSidebar) {
        cartToggle.addEventListener('click', () => {
            cartSidebar.classList.add('active');
        });
    }
    
    if (closeCart && cartSidebar) {
        closeCart.addEventListener('click', () => {
            cartSidebar.classList.remove('active');
        });
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
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

function showProductModal(productId) {
    const products = dataManager.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Товар не найден', 'error');
        return;
    }
    
    let modal = document.getElementById('productModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const featuresHtml = product.features && product.features.length > 0 ? 
        product.features.map(feature => `<li>${feature}</li>`).join('') : 
        '<li>Информация отсутствует</li>';
    
    const specsHtml = product.specifications && Object.keys(product.specifications).length > 0 ? 
        Object.entries(product.specifications).map(([key, value]) => `
            <div class="spec-row">
                <span class="spec-key">${key}:</span>
                <span class="spec-value">${value}</span>
            </div>
        `).join('') : 
        '<div class="spec-row">Информация отсутствует</div>';
    
    let imageContent = '';
    if (product.images && product.images.length > 0) {
        imageContent = product.images.map((img, index) => `
            <div class="modal-image ${index === 0 ? 'active' : ''}">
                <img src="${img}" alt="${product.name}">
            </div>
        `).join('');
    } else {
        imageContent = `
            <div class="modal-image active">
                <div style="width: 100%; height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                    ${product.name}
                </div>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-body">
                <div class="modal-images">
                    ${imageContent}
                </div>
                <div class="modal-info">
                    <h2>${product.name}</h2>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                    <div class="modal-price">${formatPrice(product.price)}</div>
                    
                    <div class="product-description">
                        <p>${product.description || 'Описание товара отсутствует.'}</p>
                    </div>
                    
                    <div class="product-features">
                        <h4>Особенности:</h4>
                        <ul>${featuresHtml}</ul>
                    </div>
                    
                    <div class="product-specifications">
                        <h4>Характеристики:</h4>
                        <div class="specs-list">${specsHtml}</div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="addToCart(${product.id}); showNotification('Товар добавлен в корзину')">
                            <i class="fas fa-shopping-cart"></i> В корзину
                        </button>
                        <button class="btn btn-outline">
                            <i class="far fa-heart"></i>
                        </button>
                        <a href="piece.html?id=${product.id}" class="btn btn-outline">
                            <i class="fas fa-external-link-alt"></i> Подробнее
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
    
    modal.classList.add('active');
}

window.showProductModal = showProductModal;
window.formatPrice = formatPrice;
window.showNotification = showNotification;
window.addToCart = addToCart;