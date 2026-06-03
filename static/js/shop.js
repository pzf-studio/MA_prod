document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('MA Furniture Shop инициализируется...');
    
    await initializeProducts();
    initializeCart();
    initializeMobileMenu();
    
    window.addEventListener('productsDataUpdated', async () => {
        console.log('Shop: Данные обновлены');
        await initializeProducts();
    });
}

function initializeCart() {
    if (!window.cartSystem) {
        window.cartSystem = new CartSystem();
        console.log('Корзина инициализирована в shop');
    }
}

/**
 * Возвращает минимальную цену товара с учётом цветовых вариантов
 */
function getMinPrice(product) {
    let prices = [product.price || 0];
    if (product.color_variants && Array.isArray(product.color_variants)) {
        product.color_variants.forEach(variant => {
            if (variant.price && variant.price > 0) prices.push(variant.price);
        });
    }
    return Math.min(...prices);
}

/**
 * Форматирует отображение цены для карточки товара
 * Логика:
 * 1. Цена под заказ → бейдж "Цена под заказ"
 * 2. Есть цветовые варианты → "от минимальной цены вариантов"
 * 3. Нет вариантов:
 *    - old_price > price (акция) → показываем текущую цену, старую зачёркнутой
 *    - price > old_price (цена выросла) → "от old_price"
 *    - old_price отсутствует → просто цена
 */
function formatCardPrice(product) {
    const isPriceOnRequest = product.is_price_on_request === 1;
    if (isPriceOnRequest) {
        return `<span class="price-on-request">Цена под заказ</span>`;
    }
    
    const hasVariants = product.color_variants && product.color_variants.length > 0;
    
    // Если есть варианты – показываем "от минимальной цены"
    if (hasVariants) {
        const minPrice = getMinPrice(product);
        return `<span class="product-price">от ${dataManager.formatPrice(minPrice)} ₽</span>`;
    }
    
    // Без вариантов
    const hasOldPrice = product.old_price != null && product.old_price > 0;
    
    // Акция: старая цена выше текущей
    if (hasOldPrice && product.old_price > product.price) {
        return `<span class="product-price">
                    ${dataManager.formatPrice(product.price)} ₽
                    <span class="old-price">${dataManager.formatPrice(product.old_price)} ₽</span>
                </span>`;
    }
    
    // Цена выросла (текущая больше старой) – показываем "от старой цены"
    if (hasOldPrice && product.price > product.old_price) {
        return `<span class="product-price">от ${dataManager.formatPrice(product.old_price)} ₽</span>`;
    }
    
    // Обычная цена без старой
    return `<span class="product-price">${dataManager.formatPrice(product.price)} ₽</span>`;
}

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

        // Бейдж (хит, новинка и т.д.)
        let badgeHtml = '';
        if (product.badge) {
            let badgeClass = '';
            switch(product.badge.toLowerCase()) {
                case 'хит продаж': case 'хит': badgeClass = 'hit'; break;
                case 'новинка': case 'new': badgeClass = 'new'; break;
                case 'акция': case 'sale': badgeClass = 'sale'; break;
                case 'эксклюзив': case 'exclusive': badgeClass = 'exclusive'; break;
                case 'премиум': case 'premium': badgeClass = 'premium'; break;
                default: badgeClass = 'new';
            }
            badgeHtml = `<div class="product-badge ${badgeClass}">${product.badge}</div>`;
        }

        // Изображение
        let imageHtml = '';
        if (product.images && product.images.length > 0) {
            imageHtml = `<img src="${product.images[0]}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        const imagePlaceholder = `<div class="image-placeholder" style="${product.images && product.images.length > 0 ? 'display: none;' : 'display: flex;'}"><i class="fas fa-couch"></i></div>`;

        // Цена (обновлённая логика)
        const priceHtml = formatCardPrice(product);

        // Статус наличия
        let stockText = '', stockClass = '';
        let addToCartDisabled = false;
        if (product.availability === 1) {
            stockText = 'Под заказ';
            stockClass = 'on-order';
            addToCartDisabled = false;
        } else {
            if (product.stock > 0) {
                stockText = 'В наличии';
                stockClass = 'in-stock';
                addToCartDisabled = false;
            } else {
                stockText = 'Нет в наличии';
                stockClass = 'out-of-stock';
                addToCartDisabled = true;
            }
        }
        const stockHtml = `<span class="stock-badge ${stockClass}">${stockText}</span>`;

        // Кнопка добавления в корзину
        const buttonText = addToCartDisabled ? '<i class="fas fa-ban"></i> Нет в наличии' : '<i class="fas fa-shopping-cart"></i> В корзину';

        // URL страницы товара
        const productUrl = `piece.html?id=${product.id}`;

        card.innerHTML = `
            <div class="product-card-image" style="background-image: url('${product.images && product.images.length > 0 ? product.images[0] : ''}'); background-size: cover; background-position: center;">
                ${imageHtml}
                ${imagePlaceholder}
                ${badgeHtml}
            </div>
            <div class="product-card-body">
                <h2 class="product-card-title">${product.name}</h2>
                <p class="product-card-description">${product.description?.substring(0, 120) || 'Качественный товар от MA Furniture'}${product.description?.length > 120 ? '...' : ''}</p>
                <div class="product-card-meta">
                    ${priceHtml}
                    ${stockHtml}
                </div>
            </div>
            <button class="btn-add-to-cart" data-product-id="${product.id}" ${addToCartDisabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
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
        document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                const product = await dataManager.getProductById(productId);
                if (product && window.cartSystem) {
                    window.cartSystem.addToCart(product);
                }
            });
        });
        
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-add-to-cart')) return;
                const link = card.querySelector('.product-link-overlay');
                if (link) window.location.href = link.href;
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
        
        if (!catalogFilters) return;
        
        try {
            const sections = await loadSectionsFromAdmin();
            
            catalogFilters.innerHTML = '<button class="filter-btn active" data-filter="all">Все товары</button>';
            
            const allFilterBtn = catalogFilters.querySelector('[data-filter="all"]');
            allFilterBtn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                allFilterBtn.classList.add('active');
                
                currentFilter = 'all';
                currentPage = 1;
                renderProducts();
            });
            
            sections.forEach(section => {
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
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
            
            if (mainNav.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav) mainNav.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        if (window.innerWidth <= 768) {
            document.addEventListener('click', (e) => {
                if (mainNav.classList.contains('active') && 
                    !mainNav.contains(e.target) && 
                    e.target !== menuToggle) {
                    mainNav.classList.remove('active');
                    menuToggle.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    }
}

function showNotification(message, type = 'success') {
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

if (window.location.pathname.includes('shop.html')) {
    loadShopBackground();
}

window.showNotification = showNotification;