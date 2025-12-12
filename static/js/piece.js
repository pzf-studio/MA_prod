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
    
    // Кнопка добавления в корзину
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (window.cartSystem) {
                window.cartSystem.addToCart(product);
            } else {
                showNotification('Корзина недоступна', 'error');
            }
        });
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