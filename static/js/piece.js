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
    
    const priceElement = document.getElementById('productPrice');
    const stockElement = document.getElementById('productStock');
    const addToCartBtn = document.getElementById('addToCartBtn');
    
    if (product.is_price_on_request) {
        // Доступен для заказа
        if (priceElement) {
            priceElement.innerHTML = `<span class="price-on-request">Доступен для заказа</span>`;
        }
        // Убираем специальное сообщение, показываем обычный статус "Под заказ"
        if (stockElement) {
            stockElement.textContent = 'Под заказ';
            stockElement.className = 'price-on-request-note'; // или переименуем класс, но оставим для стилей
        }
        // Кнопка активна, добавляем в корзину (обычная логика)
        if (addToCartBtn) {
            addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
            addToCartBtn.disabled = false;
            addToCartBtn.onclick = () => {
                if (window.cartSystem) {
                    window.cartSystem.addToCart(product);
                } else {
                    showNotification('Корзина недоступна', 'error');
                }
            };
        }
    } else {
        // Обычный товар
        const oldPriceHtml = product.old_price ? 
            `<span class="old-price">${dataManager.formatPrice(product.old_price)}</span>` : '';
        if (priceElement) {
            priceElement.innerHTML = `
                <span class="current-price">${dataManager.formatPrice(product.price)}</span>
                ${oldPriceHtml}
            `;
        }
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
                if (addToCartBtn) addToCartBtn.disabled = true;
            }
        }
        if (addToCartBtn) {
            addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
            addToCartBtn.onclick = () => {
                if (window.cartSystem) {
                    window.cartSystem.addToCart(product);
                } else {
                    showNotification('Корзина недоступна', 'error');
                }
            };
            addToCartBtn.disabled = (product.stock <= 0);
        }
    }
    
    const badgeElement = document.getElementById('productBadge');
    if (badgeElement && product.badge) {
        badgeElement.textContent = product.badge;
        badgeElement.className = `badge ${getBadgeClass(product.badge)}`;
        badgeElement.style.display = 'block';
    }
    
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
    const infoContainer = document.getElementById('selectedColorInfo');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="selected-color-details">
                <strong>Выбран цвет:</strong> ${variant.color_name}
                ${!variant.is_original ? `<br><small>Код: ${variant.variant_id}</small>` : ''}
            </div>
        `;
    }
    updateProductImages(variant.images || []);
    
    const product = window.currentProduct;
    // Если товар под заказ, цена и статус уже установлены, не меняем
    if (product && product.is_price_on_request) {
        return;
    }
    
    if (variant.price) {
        const priceElement = document.getElementById('productPrice');
        if (priceElement) {
            const oldPriceHtml = variant.old_price ? 
                `<span class="old-price">${dataManager.formatPrice(variant.old_price)}</span>` : '';
            priceElement.innerHTML = `
                <span class="current-price">${dataManager.formatPrice(variant.price)}</span>
                ${oldPriceHtml}
            `;
        }
    }
    
    const stockElement = document.getElementById('productStock');
    if (stockElement) {
        if (variant.stock > 10) {
            stockElement.textContent = 'В наличии';
            stockElement.className = 'in-stock';
        } else if (variant.stock > 0) {
            stockElement.textContent = `Осталось ${variant.stock} шт.`;
            stockElement.className = 'low-stock';
        } else {
            stockElement.textContent = 'Нет в наличии';
            stockElement.className = 'out-of-stock';
        }
    }
    
    updateAddToCartButton(variant);
}

function updateProductImages(images) {
    const mainImage = document.getElementById('productMainImage');
    const thumbnails = document.getElementById('productThumbnails');
    if (!mainImage || !thumbnails) return;
    
    if (images && images.length > 0) {
        mainImage.src = images[0];
        mainImage.style.display = 'block';
        mainImage.nextElementSibling.style.display = 'none';
    } else {
        mainImage.style.display = 'none';
        mainImage.nextElementSibling.style.display = 'flex';
    }
    
    thumbnails.innerHTML = '';
    if (images && images.length > 1) {
        images.forEach((image, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${image}" alt="Миниатюра ${index + 1}">`;
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImage.src = image;
                mainImage.style.display = 'block';
                mainImage.nextElementSibling.style.display = 'none';
            });
            thumbnails.appendChild(thumb);
        });
    }
}

function updateAddToCartButton(variant) {
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) return;
    
    const product = window.currentProduct;
    if (!product) return;
    
    // Если товар под заказ, кнопка всегда активна и добавляет в корзину (цена известна)
    if (product.is_price_on_request) {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
        addToCartBtn.onclick = () => {
            const cartProduct = {
                id: variant.variant_id,
                name: variant.is_original ? product.name : `${product.name}${variant.suffix || ''}`,
                price: variant.price || product.price,
                image: variant.images?.[0] || product.images?.[0] || '',
                quantity: 1,
                original_product_id: product.id,
                color_name: variant.color_name,
                variant_id: variant.variant_id,
                is_price_on_request: true
            };
            if (window.cartSystem) {
                window.cartSystem.addToCart(cartProduct);
            } else {
                showNotification('Корзина недоступна', 'error');
            }
        };
        return;
    }
    
    // Иначе стандартная логика
    if (variant.stock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fas fa-ban"></i> Нет в наличии';
    } else {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
    }
    
    addToCartBtn.onclick = () => {
        const cartProduct = {
            id: variant.variant_id,
            name: variant.is_original ? product.name : `${product.name}${variant.suffix || ''}`,
            price: variant.price || product.price,
            image: variant.images?.[0] || product.images?.[0] || '',
            quantity: 1,
            original_product_id: product.id,
            color_name: variant.color_name,
            variant_id: variant.variant_id,
            is_price_on_request: false
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

const colorStyles = document.createElement('style');
colorStyles.textContent = `
    .color-options { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .color-options h4 { margin: 0 0 15px 0; color: #333; font-size: 1.1rem; }
    .color-list { display: flex; flex-direction: column; gap: 10px; }
    .color-option { display: flex; align-items: center; padding: 12px 15px; background: white; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
    .color-option:hover { border-color: #3498db; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .color-option.selected { border-color: #2c3e50; background: #f8f9fa; }
    .color-sample { width: 40px; height: 40px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-right: 15px; flex-shrink: 0; }
    .color-info { flex: 1; }
    .color-name { font-weight: 600; color: #333; display: block; margin-bottom: 4px; }
    .original-badge { display: inline-block; background: #3498db; color: white; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
    .color-code { font-size: 0.85rem; color: #666; font-family: monospace; }
    .color-price { font-weight: 600; color: #2c3e50; font-size: 1rem; }
    .selected-color-info { margin-top: 15px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #dee2e6; }
    .selected-color-details { color: #333; font-size: 0.9rem; }
    .selected-color-details small { color: #666; font-size: 0.8rem; }
    @media (max-width: 768px) { .color-option { flex-direction: column; text-align: center; padding: 15px; } .color-sample { margin-right: 0; margin-bottom: 10px; } .color-price { margin-top: 10px; } }
`;
document.head.appendChild(colorStyles);

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

function initFullscreenViewer() {
    window.fullscreenViewer = new FullscreenViewer();
    addFullscreenToggle();
}

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
    document.addEventListener('click', (e) => {
        if (e.target.closest('.thumbnail img')) {
            const thumbnail = e.target.closest('.thumbnail');
            if (thumbnail) {
                const index = Array.from(thumbnail.parentElement.children).indexOf(thumbnail);
                openProductImagesFullscreen(index);
            }
        }
    });
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

function openProductImagesFullscreen(startIndex = 0) {
    const images = getCurrentProductImages();
    if (images.length === 0) return;
    window.fullscreenViewer.open(images, startIndex);
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

function updateFullscreenViewer(variant) {
    window.currentColorVariants = window.currentColorVariants || [];
    if (variant && variant.images) {
        const variantIndex = window.currentColorVariants.findIndex(v => v.variant_id === variant.variant_id);
        if (variantIndex >= 0) window.currentColorVariants[variantIndex] = variant;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { initFullscreenViewer(); }, 500);
});

const originalSelectColorVariant = selectColorVariant;
selectColorVariant = function(variant) {
    originalSelectColorVariant(variant);
    updateFullscreenViewer(variant);
};

const originalUpdateAddToCartButton = updateAddToCartButton;
updateAddToCartButton = function(variant) {
    originalUpdateAddToCartButton(variant);
    updateFullscreenViewer(variant);
};