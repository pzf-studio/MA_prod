// Главная страница MA Furniture
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, начинаем инициализацию...');
    
    // Проверяем, есть ли нужные CSS классы
    console.log('Проверяем CSS классы...');
    const testDiv = document.createElement('div');
    testDiv.className = 'featured-product-card';
    document.body.appendChild(testDiv);
    const computedStyle = window.getComputedStyle(testDiv);
    console.log('featured-product-card display:', computedStyle.display);
    console.log('featured-product-card visibility:', computedStyle.visibility);
    console.log('featured-product-card opacity:', computedStyle.opacity);
    testDiv.remove();
    
    initializeMainPage();
});

async function initializeMainPage() {
    console.log('Главная страница инициализируется...');
    
    try {
        // Проверка API
        const apiCheck = await checkAPIHealth();
        
        initializeMobileMenu();
        initializeCart();
        await loadFeaturedProducts();
        setupAnimations();
        
        // FAQ аккордеон
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const icon = this.querySelector('i');
                
                answer.classList.toggle('active');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });
        
        console.log('Инициализация завершена успешно');
    } catch (error) {
        console.error('Критическая ошибка инициализации главной страницы:', error);
        showProductLoadError(error.message);
    }
}

function initializeCart() {
    console.log('Корзина инициализирована (режим отладки)');
}

async function checkAPIHealth() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            const data = await response.json();
            return { healthy: true, data };
        }
        return { healthy: false, error: `HTTP ${response.status}` };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

async function loadFeaturedProducts() {
    try {
        console.log('=== Начинаем загрузку популярных товаров ===');
        
        // Проверяем, инициализирован ли dataManager
        if (!window.dataManager) {
            console.error('dataManager не инициализирован!');
            throw new Error('dataManager не доступен');
        }
        
        const products = await window.dataManager.getActiveProducts();
        console.log(`=== DataManager вернул товаров: ${products.length} ===`);
        
        if (products.length === 0) {
            console.warn('API вернуло 0 товаров.');
            showEmptyProductsMessage();
            return;
        }
        
        // Фильтруем популярные товары
        const featuredProducts = products
            .filter(p => {
                const isActive = p.status === 'active';
                const isRecommended = p.recommended === true;
                const isBadgeHit = p.badge === 'Хит продаж';
                const isBadgeNew = p.badge === 'Новинка';
                
                return isActive && (isRecommended || isBadgeHit || isBadgeNew);
            })
            .slice(0, 6);
        
        console.log(`=== Найдено популярных товаров: ${featuredProducts.length} ===`);
        
        if (featuredProducts.length === 0) {
            console.warn('Нет товаров с меткой recommended, "Хит продаж" или "Новинка"');
            // Возьмем первые 6 активных товаров как fallback
            const activeProducts = products
                .filter(p => p.status === 'active')
                .slice(0, 6);
            
            console.log('Показываем обычные активные товары:', activeProducts.length);
            renderFeaturedProducts(activeProducts);
        } else {
            renderFeaturedProducts(featuredProducts);
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки рекомендуемых товаров:', error);
        showProductLoadError(error.message);
    }
}

function showEmptyProductsMessage() {
    const container = document.getElementById('featuredProducts');
    if (container) {
        container.innerHTML = `
            <div class="empty-products-message">
                <i class="fas fa-box-open"></i>
                <h3>Товары пока не добавлены</h3>
                <p>База товаров пуста или временно недоступна.</p>
                <div>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Обновить
                    </button>
                </div>
            </div>
        `;
    }
}

function showProductLoadError(errorMsg = '') {
    const container = document.getElementById('featuredProducts');
    if (container) {
        container.innerHTML = `
            <div class="product-load-error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Ошибка загрузки товаров</h3>
                <p>${errorMsg || 'Не удалось загрузить данные с сервера'}</p>
                <div>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Обновить страницу
                    </button>
                </div>
            </div>
        `;
    }
}

function renderFeaturedProducts(products) {
    console.log('=== renderFeaturedProducts вызвана ===');
    console.log('Получено товаров для отображения:', products.length);
    
    const container = document.getElementById('featuredProducts');
    
    if (!container) {
        console.error('❌ Контейнер #featuredProducts не найден!');
        return;
    }
    
    console.log('✅ Контейнер найден:', container);
    
    if (products.length === 0) {
        console.log('Нет товаров для отображения');
        container.innerHTML = `
            <div class="no-products-message">
                <i class="fas fa-search"></i>
                <h3>Нет доступных товаров</h3>
                <p>Пожалуйста, проверьте позже</p>
            </div>
        `;
        return;
    }
    
    console.log('Генерируем HTML для', products.length, 'товаров');
    
    let html = '';
    
    products.forEach((product, index) => {
        console.log(`Товар ${index + 1}:`, product.name);
        
        // Безопасное получение данных
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '';
        const badge = product.badge ? `<span class="product-badge">${product.badge}</span>` : '';
        const price = product.price || 0;
        
        // Проверяем доступность dataManager.formatPrice
        let priceFormatted = `${price.toLocaleString('ru-RU')} ₽`;
        if (window.dataManager && typeof window.dataManager.formatPrice === 'function') {
            try {
                priceFormatted = window.dataManager.formatPrice(price);
            } catch (e) {
                console.warn('Ошибка форматирования цены:', e);
            }
        }
        
        html += `
            <div class="featured-product-card">
                <div class="product-image">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${product.name}" loading="lazy">` : 
                        '<div class="image-placeholder"><i class="fas fa-couch"></i></div>'
                    }
                    ${badge}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">
                        ${product.description ? product.description.substring(0, 100) + '...' : 'Описание отсутствует'}
                    </p>
                    <div class="product-price">
                        ${priceFormatted}
                    </div>
                    <div class="product-actions">
                        <a href="piece.html?id=${product.id}" class="btn btn-outline">
                            Подробнее
                        </a>
                        <button class="btn btn-primary add-to-cart" data-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    console.log('HTML сгенерирован, длина:', html.length);
    container.innerHTML = html;
    
    // Обработчики для кнопок "В корзину"
    container.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = parseInt(this.dataset.id);
            console.log('Добавление в корзину товара ID:', productId);
            
            showNotification('Товар добавлен в корзину (демо)', 'success');
        });
    });
    
    console.log('✅ Товары успешно отображены');
}

function initializeMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
            console.log('Мобильное меню переключено');
        });
    }
    
    // Закрытие меню при клике на ссылку
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav) mainNav.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        });
    });
}

function setupAnimations() {
    console.log('Настройка анимаций...');
    
    // Добавляем классы для анимации
    setTimeout(() => {
        document.querySelectorAll('.featured-product-card').forEach(el => {
            el.classList.add('fade-in');
            el.classList.add('visible');
        });
    }, 100);
}

// Плавная прокрутка для якорных ссылок
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

async function loadBackgroundImage() {
    try {
        console.log('Загрузка фона...');
        const response = await fetch(`${window.location.origin}/api/media/background`);
        const data = await response.json();
        
        if (data.success && data.background && data.background.image_url && data.background.active) {
            // Для главной страницы
            if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname.endsWith('/')) {
                const heroBackground = document.getElementById('heroBackground');
                if (heroBackground) {
                    console.log('Устанавливаем фон для heroBackground');
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
        }
    } catch (error) {
        console.error('Ошибка загрузки фона:', error);
    }
}

// Вызываем функцию загрузки фона только для главной страницы
if (window.location.pathname === '/' || 
    window.location.pathname === '/index.html' || 
    window.location.pathname.endsWith('/')) {
    loadBackgroundImage();
}

// Экспорты
window.showNotification = showNotification;