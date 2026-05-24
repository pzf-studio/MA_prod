// Простая заглушка для корзины (демонстрация стилей, без бэкенда)
// Чтобы не ломать дизайн, реализован базовый каркас с возможностью добавления (можно расширить)
// Основная задача — стили. Добавлены минимальные обработчики для демонстрации попапов.

const cartIcon = document.getElementById('cartIcon');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCartBtn');
const continueBtn = document.getElementById('continueShoppingBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutModal = document.getElementById('closeCheckoutModal');

function openCart() {
    cartOverlay.classList.add('active');
}
function closeCart() {
    cartOverlay.classList.remove('active');
}
function openCheckout() {
    closeCart();
    checkoutModal.classList.add('active');
}
function closeCheckout() {
    checkoutModal.classList.remove('active');
}

cartIcon.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
continueBtn.addEventListener('click', closeCart);
checkoutBtn.addEventListener('click', openCheckout);
closeCheckoutModal.addEventListener('click', closeCheckout);
window.addEventListener('click', (e) => {
    if (e.target === cartOverlay) closeCart();
    if (e.target === checkoutModal) closeCheckout();
});

// Загрузка категорий с сервера
async function loadCategories() {
    try {
        const res = await fetch('/api/categories/public');
        const data = await res.json();
        if (data.success && data.categories.length) {
            renderCategories(data.categories);
        } else {
            document.getElementById('categoriesGrid').innerHTML = '<p style="text-align:center;">Категории не найдены</p>';
        }
    } catch(e) {
        console.error(e);
        document.getElementById('categoriesGrid').innerHTML = '<p style="text-align:center;">Ошибка загрузки категорий</p>';
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function renderCategories(categories) {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => { window.location.href = `/shop.html?section=${encodeURIComponent(cat.code)}`; };
        
        const imageStyle = cat.image_url ? `background-image: url('${cat.image_url}')` : '';
        const fallbackIcon = cat.image_url ? '' : '<i class="fas fa-boxes fallback-icon"></i>';
        
        card.innerHTML = `
            <div class="category-card-image" style="${imageStyle}">
                ${fallbackIcon}
            </div>
            <div class="category-card-body">
                <h2 class="category-card-title">${cat.name}</h2>
                <p class="category-card-description">${cat.description || 'Системы хранения премиум качества'}</p>
                <div class="category-card-meta">
                    <span class="category-min-price">от ${formatPrice(cat.min_price)}</span>
                    <span class="category-product-count">${cat.product_count} товаров</span>
                </div>
            </div>
            <button class="btn-view-category">Смотреть все</button>
        `;
        grid.appendChild(card);
    });
    
    // Анимация reveal
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));
}

loadCategories();

// Для меню-бургера (простое переключение)
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.main-nav');
if(menuToggle) {
    menuToggle.addEventListener('click', () => {
        if(navMenu.style.display === 'flex') navMenu.style.display = 'none';
        else navMenu.style.display = 'flex';
    });
}

// ========== Защита от копирования и просмотра кода ==========
(function(){
    if(window.console){
        var noop = function(){};
        ['log','debug','info','warn','error','trace','group','groupEnd','groupCollapsed','table','dir','time','timeEnd'].forEach(function(m){
            if(console[m]) console[m] = noop;
        });
    }
    document.addEventListener('contextmenu',function(e){
        e.preventDefault();
        return false;
    });
    document.addEventListener('keydown',function(e){
        if(e.key==='F12'){e.preventDefault();return false;}
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='I'||e.key==='i')){e.preventDefault();return false;}
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='J'||e.key==='j')){e.preventDefault();return false;}
        if((e.ctrlKey||e.metaKey)&&(e.key==='U'||e.key==='u')){e.preventDefault();return false;}
        if((e.ctrlKey||e.metaKey)&&(e.key==='S'||e.key==='s')){e.preventDefault();return false;}
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='C'||e.key==='c')){e.preventDefault();return false;}
    });
    window.addEventListener('beforeunload',function(){});
})();