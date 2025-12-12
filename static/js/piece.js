document.addEventListener('DOMContentLoaded', async function() {
    await initializeProductPage();
    initializeCart();
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
        
        renderProduct(product);
        
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        showError('Не удалось загрузить информацию о товаре');
    }
}

function renderProduct(product) {
    // Сохраняем продукт глобально для доступа из других функций
    window.currentProduct = product;
    
    // Заголовок страницы
    document.title = `${product.name} - MA Furniture`;
    
    // Основное изображение
    const mainImage = document.getElementById('productMainImage');
    if (mainImage) {
        if (product.images && product.images.length > 0) {
            mainImage.src = product.images[0];
            mainImage.alt = product.name;
        } else {
            mainImage.style.display = 'none';
            mainImage.nextElementSibling.style.display = 'flex';
        }
    }
    
    // Миниатюры
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
                if (mainImage) mainImage.src = image;
            });
            thumbnails.appendChild(thumb);
        });
    }
    
    // Информация о товаре
    const nameElement = document.getElementById('productName');
    if (nameElement) nameElement.textContent = product.name;
    
    const priceElement = document.getElementById('productPrice');
    if (priceElement) {
        priceElement.innerHTML = `
            <span class="current-price">${dataManager.formatPrice(product.price)}</span>
            ${product.old_price ? 
                `<span class="old-price">${dataManager.formatPrice(product.old_price)}</span>` : ''
            }
        `;
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
    
    // Статус наличия
    const stockElement = document.getElementById('productStock');
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
    
    // Загружаем цветовые варианты
    loadProductColors(product.id);
}

/**
 * Функция загрузки цветовых вариантов товара
 */
async function loadProductColors(productId) {
    try {
        const response = await fetch(`${window.location.origin}/api/products/${productId}/colors`);
        const data = await response.json();
        
        if (!data.success || !data.variants || data.variants.length <= 1) {
            // Скрываем секцию выбора цвета если вариантов нет или только один
            const colorSection = document.querySelector('.product-colors-section');
            if (colorSection) colorSection.style.display = 'none';
            return;
        }
        
        renderColorOptions(data.variants);
        
    } catch (error) {
        console.error('Ошибка загрузки цветов:', error);
        const colorSection = document.querySelector('.product-colors-section');
        if (colorSection) colorSection.style.display = 'none';
    }
}

/**
 * Рендер цветовых опций на странице товара
 */
function renderColorOptions(variants) {
    const container = document.getElementById('colorPickerContainer');
    if (!container) return;
    
    // Если вариантов меньше 2, скрываем секцию
    if (variants.length <= 1) {
        container.style.display = 'none';
        return;
    }
    
    // Сортируем варианты: оригинал первый, затем по order
    const sortedVariants = [...variants].sort((a, b) => {
        if (a.is_original) return -1;
        if (b.is_original) return 1;
        return (a.order || 0) - (b.order || 0);
    });
    
    let html = `
        <div class="color-options">
            <h4>Доступные цвета:</h4>
            <div class="color-list">
    `;
    
    sortedVariants.forEach((variant, index) => {
        const isSelected = index === 0;
        const badge = variant.is_original ? '<span class="original-badge">оригинал</span>' : '';
        
        html += `
            <div class="color-option ${isSelected ? 'selected' : ''}" 
                 data-variant-id="${variant.variant_id}"
                 data-color-name="${variant.color_name}"
                 data-color-hex="${variant.color_hex || '#2C2C2C'}">
                <div class="color-sample" style="background-color: ${variant.color_hex || '#2C2C2C'}"></div>
                <div class="color-info">
                    <span class="color-name">${variant.color_name}</span>
                    ${badge}
                    <div class="color-code">${variant.variant_id}</div>
                </div>
                ${!variant.is_original && variant.price ? 
                    `<div class="color-price">${dataManager.formatPrice(variant.price)}</div>` : ''}
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="selected-color-info" id="selectedColorInfo">
                <!-- Информация о выбранном цвете будет обновляться -->
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Добавляем обработчики событий
    addColorOptionListeners(variants);
    
    // Устанавливаем первый вариант как выбранный
    if (variants.length > 0) {
        selectColorVariant(variants[0]);
    }
}

/**
 * Добавление обработчиков для цветовых опций
 */
function addColorOptionListeners(variants) {
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            const variantId = option.dataset.variantId;
            const variant = variants.find(v => v.variant_id === variantId);
            
            if (variant) {
                // Снимаем выделение со всех
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Выделяем выбранный
                option.classList.add('selected');
                
                // Обновляем информацию
                selectColorVariant(variant);
            }
        });
    });
}

/**
 * Обновление информации при выборе цветового варианта
 */
function selectColorVariant(variant) {
    // Обновляем информацию о выбранном цвете
    const infoContainer = document.getElementById('selectedColorInfo');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="selected-color-details">
                <strong>Выбран цвет:</strong> ${variant.color_name}
                ${!variant.is_original ? `<br><small>Код: ${variant.variant_id}</small>` : ''}
            </div>
        `;
    }
    
    // Обновляем изображения
    updateProductImages(variant.images || []);
    
    // Обновляем цену
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
    
    // Обновляем наличие
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
    
    // Обновляем кнопку добавления в корзину
    updateAddToCartButton(variant);
}

/**
 * Обновление изображений товара
 */
function updateProductImages(images) {
    const mainImage = document.getElementById('productMainImage');
    const thumbnails = document.getElementById('productThumbnails');
    
    if (!mainImage || !thumbnails) return;
    
    // Обновляем основное изображение
    if (images && images.length > 0) {
        mainImage.src = images[0];
        mainImage.style.display = 'block';
        mainImage.nextElementSibling.style.display = 'none';
    } else {
        mainImage.style.display = 'none';
        mainImage.nextElementSibling.style.display = 'flex';
    }
    
    // Обновляем миниатюры
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
            });
            thumbnails.appendChild(thumb);
        });
    }
}

/**
 * Обновление кнопки добавления в корзину
 */
function updateAddToCartButton(variant) {
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) return;
    
    // Сохраняем текущий вариант в data-атрибуте кнопки
    addToCartBtn.dataset.variantId = variant.variant_id;
    addToCartBtn.dataset.variantData = JSON.stringify(variant);
    
    // Если нет товара в наличии, блокируем кнопку
    if (variant.stock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fas fa-ban"></i> Нет в наличии';
    } else {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Добавить в корзину';
    }
    
    // Обновляем обработчик
    addToCartBtn.onclick = () => {
        const product = window.currentProduct;
        if (!product) return;
        
        const cartProduct = {
            id: variant.variant_id,
            name: variant.is_original ? product.name : `${product.name}${variant.suffix || ''}`,
            price: variant.price || product.price,
            image: variant.images?.[0] || product.images?.[0] || '',
            quantity: 1,
            original_product_id: product.id,
            color_name: variant.color_name
        };
        
        if (window.cartSystem) {
            window.cartSystem.addToCart(cartProduct);
        } else {
            showNotification('Корзина недоступна', 'error');
        }
    };
}

// Кнопка добавления в корзину изначально (до загрузки цветов)
const addToCartBtn = document.getElementById('addToCartBtn');
if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        const product = window.currentProduct;
        if (!product) return;
        
        if (window.cartSystem) {
            window.cartSystem.addToCart(product);
        } else {
            showNotification('Корзина недоступна', 'error');
        }
    });
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

function initializeCart() {
    if (!window.cartSystem && window.CartSystem) {
        window.cartSystem = new CartSystem();
    }
}

function showNotification(message, type = 'success') {
    if (window.showNotification) {
        window.showNotification(message, type);
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

// Добавляем CSS стили для цветовых опций
const colorStyles = document.createElement('style');
colorStyles.textContent = `
    .color-options {
        margin: 20px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .color-options h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1rem;
    }
    
    .color-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .color-option {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .color-option:hover {
        border-color: #3498db;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .color-option.selected {
        border-color: #2c3e50;
        background: #f8f9fa;
    }
    
    .color-sample {
        width: 40px;
        height: 40px;
        border-radius: 6px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-right: 15px;
        flex-shrink: 0;
    }
    
    .color-info {
        flex: 1;
    }
    
    .color-name {
        font-weight: 600;
        color: #333;
        display: block;
        margin-bottom: 4px;
    }
    
    .original-badge {
        display: inline-block;
        background: #3498db;
        color: white;
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
    }
    
    .color-code {
        font-size: 0.85rem;
        color: #666;
        font-family: monospace;
    }
    
    .color-price {
        font-weight: 600;
        color: #2c3e50;
        font-size: 1rem;
    }
    
    .selected-color-info {
        margin-top: 15px;
        padding: 12px;
        background: white;
        border-radius: 6px;
        border: 1px solid #dee2e6;
    }
    
    .selected-color-details {
        color: #333;
        font-size: 0.9rem;
    }
    
    .selected-color-details small {
        color: #666;
        font-size: 0.8rem;
    }
    
    @media (max-width: 768px) {
        .color-option {
            flex-direction: column;
            text-align: center;
            padding: 15px;
        }
        
        .color-sample {
            margin-right: 0;
            margin-bottom: 10px;
        }
        
        .color-price {
            margin-top: 10px;
        }
    }
`;
document.head.appendChild(colorStyles);