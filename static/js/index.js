// Главная страница MA Furniture
document.addEventListener('DOMContentLoaded', function() {
    initializeMainPage();
});

async function initializeMainPage() {
    console.log('Главная страница инициализируется...');
    
    initializeMobileMenu();
    initializeCart();
    loadFeaturedProducts();
    setupAnimations();
}

function initializeCart() {
    if (!window.cartSystem && window.CartSystem) {
        window.cartSystem = new CartSystem();
    }
}

async function loadFeaturedProducts() {
    try {
        const products = await dataManager.getActiveProducts();
        const featuredProducts = products
            .filter(p => p.recommended || p.badge === 'Хит продаж' || p.badge === 'Новинка')
            .slice(0, 6);
        
        renderFeaturedProducts(featuredProducts);
    } catch (error) {
        console.error('Ошибка загрузки рекомендуемых товаров:', error);
    }
}

function renderFeaturedProducts(products) {
    const container = document.getElementById('featuredProducts');
    if (!container || products.length === 0) return;
    
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
}

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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Экспорты
window.showNotification = showNotification;