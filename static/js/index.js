// Главная страница MA Furniture
document.addEventListener('DOMContentLoaded', function() {
    initializeMainPage();
});

async function initializeMainPage() {
    console.log('Главная страница инициализируется...');
    
    try {
        initializeMobileMenu();
        initializeCart();
        await loadFeaturedProducts(); // Добавлен await для гарантии загрузки
        setupAnimations();
        
        // FAQ аккордеон - ПЕРЕМЕЩЕНО ВНУТРЬ ФУНКЦИИ
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const icon = this.querySelector('i');
                
                answer.classList.toggle('active');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });
    } catch (error) {
        console.error('Ошибка инициализации главной страницы:', error);
    }
}

function initializeCart() {
    // Временно закомментировано, так как CartSystem не предоставлен
    // if (!window.cartSystem && window.CartSystem) {
    //     window.cartSystem = new CartSystem();
    // }
    console.log('Корзина инициализирована (режим отладки)');
}

async function loadFeaturedProducts() {
    try {
        console.log('Загрузка популярных товаров...');
        const products = await dataManager.getActiveProducts();
        console.log(`Получено товаров: ${products.length}`);
        
        // Фильтруем популярные товары
        const featuredProducts = products
            .filter(p => p.recommended || p.badge === 'Хит продаж' || p.badge === 'Новинка')
            .slice(0, 6);
        
        console.log(`Найдено популярных товаров: ${featuredProducts.length}`);
        renderFeaturedProducts(featuredProducts);
    } catch (error) {
        console.error('Ошибка загрузки рекомендуемых товаров:', error);
    }
}

function renderFeaturedProducts(products) {
    // Пробуем оба возможных ID контейнера
    const container = document.getElementById('featuredProducts') || document.getElementById('randomProductsGrid');
    
    console.log('Контейнер для товаров:', container ? 'найден' : 'не найден');
    
    if (!container) {
        console.error('Контейнер для товаров не найден! Проверьте HTML');
        return;
    }
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>Популярные товары скоро появятся</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    products.forEach(product => {
        const imageUrl = product.images?.[0] || '';
        const badge = product.badge ? `<span class="product-badge">${product.badge}</span>` : '';
        
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
                    <p class="product-description">${product.description?.substring(0, 100)}...</p>
                    <div class="product-price">${dataManager.formatPrice(product.price)}</div>
                    <div class="product-actions">
                        <a href="piece.html?id=${product.id}" class="btn btn-outline">Подробнее</a>
                        <button class="btn btn-primary add-to-cart" data-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Обработчики для кнопок "В корзину"
    container.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = parseInt(this.dataset.id);
            const product = await dataManager.getProductById(productId);
            
            if (product && window.cartSystem) {
                window.cartSystem.addToCart(product);
                showNotification('Товар добавлен в корзину', 'success');
            } else {
                showNotification('Система корзины недоступна', 'error');
            }
        });
    });
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
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
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
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function loadBackgroundImage() {
    try {
        const response = await fetch(`${window.location.origin}/api/media/background`);
        const data = await response.json();
        
        if (data.success && data.background && data.background.image_url && data.background.active) {
            // Для главной страницы
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                const heroBackground = document.getElementById('heroBackground');
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
        }
    } catch (error) {
        console.error('Ошибка загрузки фона:', error);
    }
}

// Вызываем функцию загрузки фона
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadBackgroundImage();
}

// Экспорты
window.showNotification = showNotification;