// Главная страница MA Furniture
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, начинаем инициализацию...');
    console.log('dataManager доступен?', typeof window.dataManager !== 'undefined');
    
    // Отладочная информация
    console.log('Текущий URL:', window.location.href);
    console.log('Origin:', window.location.origin);
    
    // Быстрая проверка контейнера
    const containerCheck = document.getElementById('featuredProducts');
    console.log('Контейнер #featuredProducts найден?', !!containerCheck);
    
    if (typeof window.dataManager === 'undefined') {
        console.error('dataManager не загружен! Проверьте путь к файлу.');
        // Покажем сообщение пользователю
        const container = document.getElementById('featuredProducts');
        if (container) {
            container.innerHTML = '<div style="color: red; padding: 20px; text-align: center; background: #ffe6e6; border: 1px solid red; margin: 20px;">Ошибка: dataManager не загружен. Проверьте консоль браузера.</div>';
        }
    }
    
    initializeMainPage();
});

async function initializeMainPage() {
    console.log('Главная страница инициализируется...');
    
    try {
        // Сначала проверяем API
        const apiCheck = await checkAPIHealth();
        console.log('API проверка:', apiCheck);
        
        if (!apiCheck.healthy) {
            console.error('API не отвечает:', apiCheck.error);
            showAPIFallback();
            // Продолжаем инициализацию, но с уведомлением
            showNotification('Сервер данных временно недоступен. Некоторые функции могут не работать.', 'warning');
        }
        
        initializeMobileMenu();
        initializeCart();
        
        // Загружаем товары с таймаутом
        await loadFeaturedProductsWithTimeout();
        
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
        
        // Показываем сообщение об ошибке
        const container = document.getElementById('featuredProducts');
        if (container) {
            container.innerHTML = `
                <div class="critical-error" style="text-align: center; padding: 40px; color: #d32f2f; background: #ffebee; border-radius: 10px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <h3>Произошла ошибка</h3>
                    <p>Пожалуйста, обновите страницу или попробуйте позже</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Обновить страницу
                    </button>
                </div>
            `;
        }
    }
}

// Функция с таймаутом для загрузки товаров
async function loadFeaturedProductsWithTimeout() {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут загрузки товаров (10 секунд)')), 10000);
    });
    
    const loadPromise = loadFeaturedProducts();
    
    try {
        await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
        console.error('Таймаут или ошибка загрузки товаров:', error);
        showProductLoadError();
    }
}

function initializeCart() {
    console.log('Корзина инициализирована (режим отладки)');
}

async function checkAPIHealth() {
    try {
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Health Response:', data);
            return { healthy: true, data };
        } else {
            console.warn('API Health не OK:', response.status);
            return { healthy: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        console.error('API Health ошибка:', error);
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
        
        console.log('dataManager API_BASE:', window.dataManager.API_BASE);
        
        // Тестовый запрос к API напрямую для отладки
        try {
            const testResponse = await fetch(`${window.dataManager.API_BASE}/api/products?status=active`);
            console.log('Прямой запрос к API, статус:', testResponse.status);
            
            if (testResponse.ok) {
                const testData = await testResponse.json();
                console.log('Прямой запрос, получено товаров:', testData.products ? testData.products.length : 0);
            }
        } catch (testError) {
            console.warn('Прямой запрос к API не удался:', testError);
        }
        
        // Используем dataManager
        const products = await window.dataManager.getActiveProducts();
        console.log(`=== DataManager вернул товаров: ${products.length} ===`);
        console.log('Сырые данные товаров:', products);
        
        if (products.length === 0) {
            console.warn('⚠️ API вернуло 0 товаров. Возможные причины:');
            console.warn('1. JSON файлы отсутствуют в /data/products/');
            console.warn('2. Проблема с доступом к файлам');
            console.warn('3. Ошибка в API endpoint');
            
            // Покажем информативное сообщение
            showEmptyProductsMessage();
            return;
        }
        
        // Фильтруем популярные товары
        const featuredProducts = products
            .filter(p => {
                // Безопасная проверка свойств
                const isActive = p.status === 'active';
                const isRecommended = p.recommended === true;
                const isBadgeHit = p.badge === 'Хит продаж';
                const isBadgeNew = p.badge === 'Новинка';
                
                return isActive && (isRecommended || isBadgeHit || isBadgeNew);
            })
            .slice(0, 6); // Ограничиваем 6 товарами
        
        console.log(`=== Найдено популярных товаров: ${featuredProducts.length} ===`);
        console.log('Отфильтрованные товары:', featuredProducts);
        
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
        console.error('Стек ошибки:', error.stack);
        
        // Показываем понятное сообщение об ошибке
        showProductLoadError(error.message);
        
        // Попробуем загрузить статические данные как крайний вариант
        await loadFallbackProducts();
    }
}

function showEmptyProductsMessage() {
    const container = document.getElementById('featuredProducts');
    if (container) {
        container.innerHTML = `
            <div class="empty-products-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666; background: #f9f9f9; border-radius: 10px;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px; color: #ccc;"></i>
                <h3 style="color: #555; margin-bottom: 15px;">Товары пока не добавлены</h3>
                <p style="max-width: 500px; margin: 0 auto 20px;">База товаров пуста или временно недоступна.</p>
                <div style="margin-top: 25px;">
                    <a href="/admin" class="btn btn-secondary" style="margin-right: 10px;">
                        <i class="fas fa-cog"></i> Панель администратора
                    </a>
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
            <div class="product-load-error" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #d32f2f; background: #ffebee; border-radius: 10px;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <h3 style="color: #c62828; margin-bottom: 15px;">Ошибка загрузки товаров</h3>
                <p style="margin-bottom: 20px;">${errorMsg || 'Не удалось загрузить данные с сервера'}</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Обновить страницу
                    </button>
                    <a href="shop.html" class="btn btn-secondary">
                        <i class="fas fa-store"></i> Перейти в каталог
                    </a>
                </div>
                <div style="margin-top: 25px; padding: 15px; background: rgba(0,0,0,0.05); border-radius: 5px; font-size: 0.9rem;">
                    <p style="margin: 0;">Если проблема повторяется:</p>
                    <p style="margin: 5px 0 0 0;">1. Проверьте подключение к интернету</p>
                    <p style="margin: 5px 0 0 0;">2. Обратитесь к администратору сайта</p>
                </div>
            </div>
        `;
    }
}

async function loadFallbackProducts() {
    console.log('Пытаемся загрузить fallback товары...');
    
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    // Статические данные для fallback
    const fallbackProducts = [
        {
            id: 1,
            name: "Электрический пантограф Premium",
            description: "Премиум электрический пантограф с плавным ходом и бесшумным электроприводом",
            price: 45000,
            images: ["/static/images/1.png"],
            badge: "Новинка",
            status: "active"
        },
        {
            id: 2,
            name: "Система хранения гардеробная",
            description: "Ящики и органайзеры с корпусами из алюминия с отделкой из итальянской экокожи",
            price: 25000,
            images: ["/static/images/2.jpeg"],
            badge: "Хит продаж",
            status: "active"
        },
        {
            id: 3,
            name: "Вращающаяся обувница",
            description: "Вращающаяся на 360° система хранения обуви с полками из итальянской экокожи",
            price: 35000,
            images: ["/static/images/3.jpg"],
            badge: "",
            status: "active"
        }
    ];
    
    console.log('Показываем fallback товары:', fallbackProducts);
    renderFeaturedProducts(fallbackProducts);
}

function renderFeaturedProducts(products) {
    console.log('=== renderFeaturedProducts вызвана ===');
    console.log('Получено товаров для отображения:', products.length);
    
    // Исправляем поиск контейнера - только один ID
    const container = document.getElementById('featuredProducts');
    
    if (!container) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Контейнер #featuredProducts не найден!');
        console.error('Проверьте HTML - должен быть элемент с id="featuredProducts"');
        
        // Пытаемся найти альтернативные контейнеры
        const alternatives = document.querySelectorAll('.random-products-grid, .shop-mini-preview .container');
        console.log('Найдено альтернативных контейнеров:', alternatives.length);
        
        if (alternatives.length > 0) {
            const altContainer = alternatives[0];
            console.log('Используем альтернативный контейнер:', altContainer);
            renderProductsToContainer(products, altContainer);
        } else {
            // Создаем отладочное сообщение прямо в body
            const debugDiv = document.createElement('div');
            debugDiv.style.cssText = 'color: red; padding: 20px; background: #ffe6e6; border: 3px solid red; margin: 20px; font-family: monospace;';
            debugDiv.innerHTML = `
                <h3 style="color: red;">ОШИБКА: Контейнер для товаров не найден</h3>
                <p><strong>ID искомого контейнера:</strong> featuredProducts</p>
                <p><strong>Текущий HTML:</strong> ${document.body.innerHTML.substring(0, 500)}...</p>
                <button onclick="console.log(document.getElementById(\'featuredProducts\'))" style="margin-top: 10px; padding: 5px 10px;">
                    Проверить в консоли
                </button>
            `;
            document.body.prepend(debugDiv);
        }
        return;
    }
    
    console.log('✅ Контейнер найден:', container);
    renderProductsToContainer(products, container);
}

function renderProductsToContainer(products, container) {
    console.log('renderProductsToContainer вызвана, товаров:', products.length);
    
    if (products.length === 0) {
        console.log('Нет товаров для отображения');
        container.innerHTML = `
            <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-search" style="font-size: 2.5rem; margin-bottom: 15px; color: #ccc;"></i>
                <h3 style="color: #555;">Нет доступных товаров</h3>
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
            <div class="featured-product-card" style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.3s ease;">
                <div class="product-image" style="position: relative; height: 200px; overflow: hidden; background: #f5f5f5;">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${product.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">` : 
                        '<div class="image-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #8B7355; font-size: 3rem;"><i class="fas fa-couch"></i></div>'
                    }
                    ${badge}
                </div>
                <div class="product-info" style="padding: 1.5rem; display: flex; flex-direction: column; flex-grow: 1;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.8rem; color: #333; line-height: 1.4;">${product.name}</h3>
                    <p class="product-description" style="font-size: 0.9rem; color: #666; line-height: 1.5; margin-bottom: 1rem; flex-grow: 1;">
                        ${product.description ? product.description.substring(0, 100) + '...' : 'Описание отсутствует'}
                    </p>
                    <div class="product-price" style="font-size: 1.2rem; font-weight: bold; color: #8B7355; margin-bottom: 1rem;">
                        ${priceFormatted}
                    </div>
                    <div class="product-actions" style="display: flex; gap: 10px; align-items: center;">
                        <a href="piece.html?id=${product.id}" class="btn btn-outline" style="flex-grow: 1; text-align: center; padding: 10px; border: 2px solid #e0e0e0; background: transparent; color: #333; text-decoration: none; border-radius: 5px; transition: all 0.3s ease;">
                            Подробнее
                        </a>
                        <button class="btn btn-primary add-to-cart" data-id="${product.id}" style="padding: 10px; background: #8B7355; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background 0.3s ease;">
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
            
            try {
                const product = await window.dataManager.getProductById(productId);
                
                if (product && window.cartSystem) {
                    window.cartSystem.addToCart(product);
                    showNotification('Товар добавлен в корзину', 'success');
                } else {
                    showNotification('Система корзины недоступна', 'warning');
                    // Fallback: сохраняем в localStorage
                    const cart = JSON.parse(localStorage.getItem('ma_furniture_cart') || '[]');
                    cart.push({ id: productId, quantity: 1 });
                    localStorage.setItem('ma_furniture_cart', JSON.stringify(cart));
                    showNotification('Товар добавлен в локальную корзину', 'success');
                }
            } catch (error) {
                console.error('Ошибка добавления в корзину:', error);
                showNotification('Ошибка добавления в корзину', 'error');
            }
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
    } else {
        console.warn('Элементы мобильного меню не найдены');
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
    
    // Анимация появления элементов при скролле
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Наблюдаем за секциями
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
    
    // Добавляем классы для анимации
    document.querySelectorAll('.featured-product-card, .shop-card, .feature-item').forEach(el => {
        el.classList.add('fade-in');
    });
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
    console.log('Показ уведомления:', message, type);
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#e74c3c'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-weight: 500;
        min-width: 200px;
        text-align: center;
    `;
    
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
        
        console.log('Ответ фона:', data);
        
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
                    img.onerror = function() {
                        console.error('Ошибка загрузки фонового изображения');
                    };
                }
            }
            
            // Для страницы shop
            if (window.location.pathname.includes('shop.html')) {
                const shopHeroBackground = document.getElementById('shopHeroBackground');
                if (shopHeroBackground) {
                    const img = new Image();
                    img.src = data.background.image_url;
                    img.onload = function() {
                        shopHeroBackground.style.backgroundImage = `url('${data.background.image_url}')`;
                        shopHeroBackground.style.backgroundSize = 'cover';
                        shopHeroBackground.style.backgroundPosition = 'center';
                        shopHeroBackground.style.backgroundRepeat = 'no-repeat';
                    };
                }
            }
        } else {
            console.log('Фон не настроен или не активен');
        }
    } catch (error) {
        console.error('Ошибка загрузки фона:', error);
    }
}

function showAPIFallback() {
    console.log('Показываем fallback для API');
    const container = document.getElementById('featuredProducts');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; color: #856404;">
                <i class="fas fa-server" style="font-size: 3rem; margin-bottom: 20px; color: #ffc107;"></i>
                <h3 style="color: #856404;">Сервер данных временно недоступен</h3>
                <p>Вы можете просмотреть демонстрационные товары</p>
                <div style="margin-top: 30px;">
                    <button onclick="loadFallbackProducts()" class="btn btn-primary" style="margin-right: 10px;">
                        <i class="fas fa-eye"></i> Показать демо-товары
                    </button>
                    <a href="shop.html" class="btn btn-secondary">
                        <i class="fas fa-store"></i> Перейти в каталог
                    </a>
                </div>
            </div>
        `;
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
window.loadFallbackProducts = loadFallbackProducts;

// Инициализация при загрузке
console.log('index.js загружен и готов к работе');