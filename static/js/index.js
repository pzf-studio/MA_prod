// index.js - обновленный файл
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    migrateProductImages();
    initializeSmoothScroll();
    initializeFAQ();
    initializeMobileMenu();
    
    loadRecommendedProducts();
    loadRandomProducts();
    
    window.addEventListener('productsDataUpdated', () => {
        console.log('Index: Данные обновлены');
        loadRecommendedProducts();
        loadRandomProducts();
    });
}

function migrateProductImages() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    let needsUpdate = false;
    
    products.forEach(product => {
        if (product.image && (!product.images || product.images.length === 0)) {
            product.images = [product.image];
            needsUpdate = true;
        }
    });
    
    if (needsUpdate) {
        localStorage.setItem('products', JSON.stringify(products));
        console.log('Миграция изображений завершена');
    }
}

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

function initializeMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            
            const spans = menuToggle.querySelectorAll('span');
            if (mainNav.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
}

function loadRecommendedProducts() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const recommendedGrid = document.querySelector('.recommended-products-grid');
    
    if (!recommendedGrid) return;
    
    const recommendedProducts = products.filter(product => product.recommended === 'true');
    
    if (recommendedProducts.length === 0) {
        recommendedGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>Рекомендуемые товары появятся здесь</p>
            </div>
        `;
        return;
    }
    
    recommendedGrid.innerHTML = '';
    
    recommendedProducts.forEach(product => {
        const productCard = createProductCard(product);
        recommendedGrid.appendChild(productCard);
    });
}

function loadRandomProducts() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const randomGrid = document.querySelector('.random-products-grid');
    
    if (!randomGrid) return;
    
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const randomProducts = shuffled.slice(0, 3);
    
    if (randomProducts.length === 0) {
        randomGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>Случайные товары появятся здесь</p>
            </div>
        `;
        return;
    }
    
    randomGrid.innerHTML = '';
    
    randomProducts.forEach(product => {
        const productCard = createRandomProductCard(product);
        randomGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const productImage = (product.images && product.images.length > 0) 
        ? product.images[0] 
        : product.image || null;
    
    card.innerHTML = `
        <div class="product-image">
            ${productImage ? `<img src="${productImage}" alt="${product.name}" loading="lazy">` : 
              '<div class="no-image"><i class="fas fa-box"></i><p>Изображение отсутствует</p></div>'}
            ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description || 'Описание товара'}</p>
            <div class="product-price">${formatPrice(product.price)}</div>
        </div>
    `;
    
    return card;
}

function createRandomProductCard(product) {
    const card = document.createElement('div');
    card.className = 'random-product-card';
    
    const productImage = (product.images && product.images.length > 0) 
        ? product.images[0] 
        : product.image || null;
    
    card.innerHTML = `
        <div class="random-product-image">
            ${productImage ? `<img src="${productImage}" alt="${product.name}" loading="lazy">` : 
              '<div class="no-image"><i class="fas fa-box"></i><p>Изображение отсутствует</p></div>'}
            ${product.badge ? `<span class="random-product-badge">${product.badge}</span>` : ''}
        </div>
        <div class="random-product-content">
            <div class="random-product-category">${product.category || 'Категория'}</div>
            <h3 class="random-product-title">${product.name}</h3>
            <div class="random-product-price">${formatPrice(product.price)}</div>
            <ul class="random-product-features">
                <li>Высокое качество</li>
                <li>Быстрая доставка</li>
                <li>Гарантия возврата</li>
            </ul>
            <div class="random-product-actions">
                <a href="shop.html?product=${product.id}" class="btn btn-small">
                    <i class="fas fa-eye"></i> Подробнее
                </a>
            </div>
        </div>
    `;
    
    return card;
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

const style = document.createElement('style');
style.textContent = `
    .empty-products {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem;
        color: var(--text-light);
    }
    
    .empty-products i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #ddd;
    }
`;
document.head.appendChild(style);