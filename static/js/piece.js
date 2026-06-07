document.addEventListener('DOMContentLoaded', async function() {
    if (!window.cartSystem) {
        window.cartSystem = new CartSystem();
        console.log('Корзина инициализирована в piece');
    }
    await initializeProductPage();
});

async function initializeProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        showError('Товар не найден');
        return;
    }
    
    try {
        const product = await dataManager.getProductById(productId);
        if (!product) {
            showError('Товар не найден');
            return;
        }
        window.currentProduct = product;
        renderProduct(product);
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        showError('Не удалось загрузить информацию о товаре');
    }
}

function formatPiecePrice(productOrVariant) {
    const price = productOrVariant.price !== undefined ? productOrVariant.price : 0;
    const oldPrice = productOrVariant.old_price != null ? productOrVariant.old_price : null;
    const isPriceOnRequest = productOrVariant.is_price_on_request === 1;

    if (isPriceOnRequest) {
        return `<span class="price-on-request">Цена под заказ</span>`;
    }

    if (price === 0 && (oldPrice === null || oldPrice === 0)) {
        return `<span class="price-on-request">Под заказ</span>`;
    }

    if (oldPrice !== null && oldPrice > price) {
        return `<span class="current-price">${dataManager.formatPrice(price)}</span> <span class="old-price">${dataManager.formatPrice(oldPrice)}</span>`;
    }

    if (oldPrice !== null && price > oldPrice && oldPrice > 0) {
        return `<span class="current-price">От ${dataManager.formatPrice(oldPrice)}</span>`;
    }

    return `<span class="current-price">${dataManager.formatPrice(price)}</span>`;
}

function renderProduct(product) {
    document.title = `${product.name} - MA Furniture`;
    
    const mainImage = document.getElementById('productMainImage');
    if (mainImage) {
        if (product.images && product.images.length > 0) {
            mainImage.src = product.images[0];
            mainImage.alt = product.name;
            mainImage.style.display = 'block';
            mainImage.nextElementSibling.style.display = 'none';
        } else {
            mainImage.style.display = 'none';
            mainImage.nextElementSibling.style.display = 'flex';
        }
    }
    
    const thumbnails = document.getElementById('productThumbnails');
    if (thumbnails && product.images && product.images.length > 1) {
        thumbnails.innerHTML = '';
        product.images.forEach((image, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${image}" alt="Миниатюра ${index + 1}">`;
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImage) {
                    mainImage.src = image;
                    mainImage.style.display = 'block';
                    mainImage.nextElementSibling.style.display = 'none';
                }
            });
            thumbnails.appendChild(thumb);
        });
    }
    
    const nameElement = document.getElementById('productName');
    if (nameElement) nameElement.textContent = product.name;
    
    const badgeElement = document.getElementById('productBadge');
    if (badgeElement && product.badge) {
        badgeElement.textContent = product.badge;
        badgeElement.className = `product-badge ${getBadgeClass(product.badge)}`;
        badgeElement.style.display = 'block';
    } else if (badgeElement) {
        badgeElement.style.display = 'none';
    }
    
    const priceElement = document.getElementById('productPrice');
    const stockElement = document.getElementById('productStock');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (priceElement) {
        priceElement.innerHTML = formatPiecePrice(product);
    }
    
    const isOnOrder = (product.availability === 1);
    if (isOnOrder) {
        if (stockElement) {
            stockElement.textContent = 'Под заказ';
            stockElement.className = 'order-badge';
        }
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
        }
    } else {
        if (stockElement) {
            if (product.stock > 10) {
                stockElement.textContent = 'В наличии';
                stockElement.className = 'in-stock';
            } else if (product.stock > 0) {
                stockElement.textContent = `Осталось ${product.stock} шт.`;
                stockElement.className = 'low-stock';
            } else {
                stockElement.textContent = 'Нет в наличии';
                stockElement.className = 'out-of-stock';
            }
        }
        if (addToCartBtn) {
            addToCartBtn.disabled = (product.stock <= 0);
            addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
        }
    }
    
    addToCartBtn.onclick = function() {
        const cartProduct = {
            id: product.id,
            name: product.name,
            price: (product.price === 0 && !product.is_price_on_request) ? 0 : product.price,
            old_price: product.old_price || null,
            image: product.images?.[0] || '',
            quantity: 1,
            is_price_on_request: product.is_price_on_request === 1 || (product.price === 0 && product.old_price === null),
            availability: product.availability
        };
        if (window.cartSystem) {
            window.cartSystem.addToCart(cartProduct);
        } else {
            showNotification('Корзина недоступна', 'error');
        }
    };
    
    const descriptionElement = document.getElementById('productDescription');
    if (descriptionElement) {
        descriptionElement.innerHTML = product.description?.replace(/\n/g, '<br>') || 'Описание отсутствует';
    }
    
    const specsElement = document.getElementById('productSpecifications');
    if (specsElement && product.specifications) {
        const specs = product.specifications.split('\n').filter(s => s.trim());
        specsElement.innerHTML = specs.map(spec => `<li>${spec}</li>`).join('');
    }
    
    loadProductColors(product.id);
}

async function loadProductColors(productId) {
    try {
        const response = await fetch(`${window.location.origin}/api/products/${productId}/colors`);
        const data = await response.json();
        if (!data.success || !data.variants || data.variants.length <= 1) {
            const colorSection = document.querySelector('.product-colors-section');
            if (colorSection) colorSection.style.display = 'none';
            return;
        }
        initCircularColorPicker(data.variants, data.base_name);
    } catch (error) {
        console.error('Ошибка загрузки цветов:', error);
        const colorSection = document.querySelector('.product-colors-section');
        if (colorSection) colorSection.style.display = 'none';
    }
}

function initCircularColorPicker(variants, baseProductName) {
    const container = document.getElementById('colorPickerContainer');
    if (!container) return;
    const colorPicker = new ColorPicker('colorPickerContainer', {
        baseProductName: baseProductName,
        onColorChange: function(variant) {
            selectColorVariant(variant);
        }
    });
    colorPicker.setVariants(variants);
    if (variants.length > 0) {
        colorPicker.selectVariant(variants[0].variant_id);
    }
}

function selectColorVariant(variant) {
    const product = window.currentProduct;
    if (!product) return;
    
    if (variant.images && variant.images.length > 0) {
        const mainImage = document.getElementById('productMainImage');
        const thumbnails = document.getElementById('productThumbnails');
        if (mainImage) {
            mainImage.src = variant.images[0];
            mainImage.style.display = 'block';
            mainImage.nextElementSibling.style.display = 'none';
        }
        if (thumbnails) {
            thumbnails.innerHTML = '';
            variant.images.forEach((image, index) => {
                const thumb = document.createElement('div');
                thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                thumb.innerHTML = `<img src="${image}" alt="Миниатюра ${index + 1}">`;
                thumb.addEventListener('click', () => {
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                    if (mainImage) {
                        mainImage.src = image;
                        mainImage.style.display = 'block';
                        mainImage.nextElementSibling.style.display = 'none';
                    }
                });
                thumbnails.appendChild(thumb);
            });
        }
    }
    
    const priceElement = document.getElementById('productPrice');
    if (priceElement) {
        const variantPriceObj = {
            price: variant.price !== undefined ? variant.price : product.price,
            old_price: variant.old_price !== undefined ? variant.old_price : product.old_price,
            is_price_on_request: product.is_price_on_request
        };
        priceElement.innerHTML = formatPiecePrice(variantPriceObj);
    }
    
    const stockElement = document.getElementById('productStock');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const variantStock = variant.stock !== undefined ? variant.stock : product.stock;
    const isOnOrder = (product.availability === 1);
    
    if (isOnOrder) {
        if (stockElement) {
            stockElement.textContent = 'Под заказ';
            stockElement.className = 'order-badge';
        }
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
        }
    } else {
        if (stockElement) {
            if (variantStock > 10) {
                stockElement.textContent = 'В наличии';
                stockElement.className = 'in-stock';
            } else if (variantStock > 0) {
                stockElement.textContent = `Осталось ${variantStock} шт.`;
                stockElement.className = 'low-stock';
            } else {
                stockElement.textContent = 'Нет в наличии';
                stockElement.className = 'out-of-stock';
            }
        }
        if (addToCartBtn) {
            addToCartBtn.disabled = (variantStock <= 0);
            addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
        }
    }
    
    addToCartBtn.onclick = function() {
        const cartProduct = {
            id: variant.variant_id || product.id,
            name: variant.is_original ? product.name : `${product.name}${variant.suffix || ''}`,
            price: variant.price !== undefined ? variant.price : product.price,
            old_price: variant.old_price !== undefined ? variant.old_price : product.old_price,
            image: variant.images?.[0] || product.images?.[0] || '',
            quantity: 1,
            original_product_id: product.id,
            color_name: variant.color_name,
            variant_id: variant.variant_id,
            is_price_on_request: product.is_price_on_request === 1 || (variant.price === 0 && variant.old_price === null),
            availability: product.availability
        };
        if (window.cartSystem) {
            window.cartSystem.addToCart(cartProduct);
        } else {
            showNotification('Корзина недоступна', 'error');
        }
    };
}

function getBadgeClass(badge) {
    switch(badge.toLowerCase()) {
        case 'хит продаж':
        case 'хит':
            return 'hit';
        case 'новинка':
        case 'new':
            return 'new';
        case 'акция':
        case 'sale':
            return 'sale';
        case 'эксклюзив':
        case 'exclusive':
            return 'exclusive';
        case 'премиум':
        case 'premium':
            return 'premium';
        default:
            return 'new';
    }
}

function showError(message) {
    const container = document.querySelector('.product-container') || document.body;
    container.innerHTML = `
        <div style="text-align: center; padding: 50px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff6b6b; margin-bottom: 20px;"></i>
            <h2 style="color: #333; margin-bottom: 15px;">${message}</h2>
            <p style="color: #666; margin-bottom: 30px;">Попробуйте вернуться в каталог и выбрать другой товар</p>
            <a href="shop.html" class="btn btn-primary" style="text-decoration: none;">
                <i class="fas fa-arrow-left"></i> Вернуться в каталог
            </a>
        </div>
    `;
}

function showNotification(message, type = 'success') {
    if (window.cartSystem && window.cartSystem.showNotification) {
        window.cartSystem.showNotification(message, type);
        return;
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

class FullscreenViewer {
    constructor() {
        this.viewer = document.getElementById('fullscreenViewer');
        this.fullscreenImage = document.getElementById('fullscreenImage');
        this.closeBtn = document.getElementById('fullscreenClose');
        this.prevBtn = document.getElementById('fullscreenPrev');
        this.nextBtn = document.getElementById('fullscreenNext');
        this.counter = document.getElementById('fullscreenCounter');
        this.currentImages = [];
        this.currentIndex = 0;
        this.init();
    }
    
    init() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        this.viewer.addEventListener('click', (e) => { if (e.target === this.viewer) this.close(); });
        document.addEventListener('keydown', (e) => {
            if (!this.viewer.classList.contains('active')) return;
            switch(e.key) {
                case 'Escape': this.close(); break;
                case 'ArrowLeft': this.prev(); break;
                case 'ArrowRight': this.next(); break;
            }
        });
        this.fullscreenImage.addEventListener('click', (e) => e.stopPropagation());
    }
    
    open(images, startIndex = 0) {
        if (!images || images.length === 0) return;
        this.currentImages = images;
        this.currentIndex = startIndex;
        this.updateImage();
        this.viewer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.viewer.classList.remove('active');
        this.currentImages = [];
        this.currentIndex = 0;
        document.body.style.overflow = '';
    }
    
    prev() {
        if (this.currentImages.length <= 1) return;
        this.currentIndex--;
        if (this.currentIndex < 0) this.currentIndex = this.currentImages.length - 1;
        this.updateImage();
    }
    
    next() {
        if (this.currentImages.length <= 1) return;
        this.currentIndex++;
        if (this.currentIndex >= this.currentImages.length) this.currentIndex = 0;
        this.updateImage();
    }
    
    updateImage() {
        const image = this.currentImages[this.currentIndex];
        this.fullscreenImage.src = image;
        this.fullscreenImage.alt = `Изображение ${this.currentIndex + 1}`;
        this.counter.textContent = `${this.currentIndex + 1} / ${this.currentImages.length}`;
        this.prevBtn.style.display = this.currentImages.length > 1 ? 'flex' : 'none';
        this.nextBtn.style.display = this.currentImages.length > 1 ? 'flex' : 'none';
        this.counter.style.display = this.currentImages.length > 1 ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.fullscreenViewer = new FullscreenViewer();
        addFullscreenToggle();
    }, 500);
});

function addFullscreenToggle() {
    const mainImageContainer = document.querySelector('.main-image-container');
    if (!mainImageContainer) return;
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'fullscreen-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-expand"></i>';
    toggleBtn.title = 'Открыть в полноэкранном режиме';
    mainImageContainer.appendChild(toggleBtn);
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMainImageFullscreen();
    });
    const mainImage = document.getElementById('productMainImage');
    if (mainImage) {
        mainImage.style.cursor = 'zoom-in';
        mainImage.addEventListener('click', () => openMainImageFullscreen());
    }
}

function openMainImageFullscreen() {
    const product = window.currentProduct;
    if (!product || !product.images || product.images.length === 0) return;
    const mainImage = document.getElementById('productMainImage');
    const currentImage = mainImage.src;
    const images = getCurrentProductImages();
    const startIndex = images.indexOf(currentImage);
    window.fullscreenViewer.open(images, startIndex >= 0 ? startIndex : 0);
}

function getCurrentProductImages() {
    const product = window.currentProduct;
    if (!product) return [];
    const colorOption = document.querySelector('.color-option.selected');
    if (colorOption && window.currentColorVariants) {
        const variantId = colorOption.dataset.variantId;
        const variant = window.currentColorVariants.find(v => v.variant_id === variantId);
        if (variant && variant.images && variant.images.length > 0) return variant.images;
    }
    return product.images || [];
}