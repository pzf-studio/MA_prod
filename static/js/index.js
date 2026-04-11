document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, начинаем инициализацию...');
    
    // Сначала скрываем весь контент для плавного появления
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease';
    
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
    
    // Плавное появление всего сайта
    setTimeout(() => {
        document.body.style.opacity = '1';
        
        // Инициализация анимации элементов
        initializeMainPage();
        initializePageAnimations();
        
        // Дополнительная анимация для элементов при прокрутке
        setTimeout(() => {
            setupScrollAnimations();
        }, 500);
    }, 100);
});

// Новая функция для анимации загрузки страницы
function initializePageAnimations() {
    console.log('Инициализация анимаций загрузки страницы...');
    
    // Добавляем классы для анимации элементов
    const elementsToAnimate = [
        '.header',
        '.hero-section',
        '.section-title',
        '.shop-card',
        '.feature-item',
        '.luxury-catalog-box',
        '.faq-item',
        '.main-footer'
    ];
    
    elementsToAnimate.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
            // Удаляем возможные предыдущие классы
            element.classList.remove('page-fade-in', 'page-slide-up', 'visible');
            
            // Добавляем задержку для последовательного появления
            setTimeout(() => {
                if (selector.includes('header')) {
                    element.classList.add('page-fade-in', 'visible');
                } else if (selector.includes('hero')) {
                    element.classList.add('page-slide-up', 'visible');
                } else {
                    // Чередуем анимации для разнообразия
                    if (index % 2 === 0) {
                        element.classList.add('page-fade-in', 'visible');
                    } else {
                        element.classList.add('page-slide-up', 'visible');
                    }
                }
            }, 50 * index);
        });
    });
    
    // Анимация для кнопок и интерактивных элементов
    setTimeout(() => {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach((button, index) => {
            setTimeout(() => {
                button.classList.add('btn-float-in', 'visible');
            }, 100 * index);
        });
    }, 300);
    
    // Анимация для логотипа
    const logo = document.querySelector('.logo-container');
    if (logo) {
        setTimeout(() => {
            logo.classList.add('logo-pulse', 'visible');
        }, 200);
    }
    
    // Анимация для индикатора прокрутки
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        setTimeout(() => {
            scrollIndicator.classList.add('bounce-in', 'visible');
        }, 1000);
    }
}

// Новая функция для анимации при прокрутке
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.section-title, .shop-card, .feature-item, .faq-item, .random-product-card'
    );
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('scroll-visible');
                    
                    // Специальная анимация для карточек товаров
                    if (entry.target.classList.contains('shop-card') || 
                        entry.target.classList.contains('random-product-card')) {
                        entry.target.classList.add('card-pop');
                    }
                    
                    // Анимация для заголовков секций
                    if (entry.target.classList.contains('section-title')) {
                        entry.target.classList.add('title-underline');
                    }
                }, 100);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(el => {
        el.classList.add('scroll-animate');
        observer.observe(el);
    });
}

async function initializeMainPage() {
    console.log('Главная страница инициализируется...');
    
    try {
        // Проверка API
        const apiCheck = await checkAPIHealth();
        
        // initializeMobileMenu(); // Удален вызов мобильного меню
        initializeCart();
        await loadFeaturedProducts();
        setupAnimations();
        
        // FAQ аккордеон
        
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
            <div class="featured-product-card product-animate-in" style="animation-delay: ${index * 0.1}s">
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
                        <a href="/product/${product.id}" class="btn btn-outline">
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
            
            // Анимация нажатия кнопки
            this.classList.add('btn-click-animation');
            setTimeout(() => {
                this.classList.remove('btn-click-animation');
            }, 300);
            
            showNotification('Товар добавлен в корзину (демо)', 'success');
        });
    });
    
    console.log('✅ Товары успешно отображены');
}

// Функция initializeMobileMenu полностью удалена

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
            // Анимация перед прокруткой
            this.classList.add('link-click-animation');
            setTimeout(() => {
                this.classList.remove('link-click-animation');
            }, 300);
            
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
                        
                        // Анимация появления фона
                        heroBackground.classList.add('bg-fade-in');
                    };
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки фона:', error);
    }
}

// Анимация для логотипа при наведении
function setupLogoAnimation() {
    const logo = document.querySelector('.logo-container');
    if (logo) {
        logo.addEventListener('mouseenter', () => {
            logo.classList.add('logo-hover');
        });
        
        logo.addEventListener('mouseleave', () => {
            logo.classList.remove('logo-hover');
        });
    }
}

// Инициализация всех анимаций при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupLogoAnimation();
    }, 1000);
});

// Вызываем функцию загрузки фона только для главной страницы
if (window.location.pathname === '/' || 
    window.location.pathname === '/index.html' || 
    window.location.pathname.endsWith('/')) {
    loadBackgroundImage();
}

// Экспорты
window.showNotification = showNotification;