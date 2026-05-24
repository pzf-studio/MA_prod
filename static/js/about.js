// ========== ЗАЩИТА ОТ КОПИРОВАНИЯ И ПРОСМОТРА КОДА ==========
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

// ========== ОСНОВНАЯ ЛОГИКА СТРАНИЦЫ ==========
document.addEventListener('DOMContentLoaded', function() {
    // Анимация счётчиков
    const statNumbers = document.querySelectorAll('.stat-mini-number');
    let animated = false;
    function animateStats() {
        if (animated) return;
        statNumbers.forEach(el => {
            const target = parseInt(el.getAttribute('data-target'));
            let current = 0;
            const increment = target / 60;
            function update() {
                current += increment;
                if (current < target) {
                    el.innerText = Math.floor(current);
                    requestAnimationFrame(update);
                } else {
                    el.innerText = target;
                }
            }
            update();
        });
        animated = true;
    }
    
    // Reveal анимация + триггер для счётчиков
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('stats-minimal') && !animated) {
                    animateStats();
                }
            }
        });
    }, { threshold: 0.2 });
    revealElements.forEach(el => observer.observe(el));
    const statsBlock = document.querySelector('.stats-minimal');
    if(statsBlock) observer.observe(statsBlock);

    // Форма обратной связи
    const form = document.getElementById('contactForm');
    const statusDiv = document.getElementById('formStatus');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();
            if (!name || !email || !message) {
                statusDiv.style.color = '#b33';
                statusDiv.innerText = 'Заполните имя, email и сообщение.';
                return;
            }
            statusDiv.style.color = '#2c6e2c';
            statusDiv.innerText = 'Отправка...';
            setTimeout(() => {
                statusDiv.innerText = 'Спасибо! Мы свяжемся с вами в ближайшее время.';
                form.reset();
                setTimeout(() => statusDiv.innerText = '', 4000);
            }, 800);
        });
    }

    // DROPDOWN логика
    const dropdown = document.getElementById('contactDropdown');
    const toggleBtn = document.getElementById('dropdownToggleBtn');
    const menu = document.getElementById('dropdownMenu');
    if (dropdown && toggleBtn && menu) {
        function closeDropdown() {
            menu.classList.remove('show');
        }
        function toggleDropdown(e) {
            e.stopPropagation();
            menu.classList.toggle('show');
        }
        toggleBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', function(event) {
            if (!dropdown.contains(event.target)) closeDropdown();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && menu.classList.contains('show')) closeDropdown();
        });
    }

    // Загрузка фона для hero (как на главной)
    async function loadAboutBackground() {
        try {
            console.log('Загрузка фона для about...');
            const response = await fetch(`${window.location.origin}/api/media/background`);
            const data = await response.json();
            if (data.success && data.background && data.background.image_url && data.background.active) {
                const heroBg = document.getElementById('heroBgDynamic');
                if (heroBg) {
                    const img = new Image();
                    img.src = data.background.image_url;
                    img.onload = function() {
                        heroBg.style.backgroundImage = `url('${data.background.image_url}')`;
                        heroBg.style.backgroundSize = 'cover';
                        heroBg.style.backgroundPosition = 'center';
                        heroBg.style.backgroundRepeat = 'no-repeat';
                        heroBg.classList.add('bg-fade-in');
                    };
                }
            } else {
                // fallback, если фон не загрузился
                const heroBg = document.getElementById('heroBgDynamic');
                if (heroBg) heroBg.style.backgroundImage = "url('/static/images/hero.jpg')";
            }
        } catch (error) {
            console.error('Ошибка загрузки фона:', error);
            const heroBg = document.getElementById('heroBgDynamic');
            if (heroBg) heroBg.style.backgroundImage = "url('/static/images/hero.jpg')";
        }
    }
    loadAboutBackground();

    // Плавная прокрутка для индикатора
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
        });
    }
});