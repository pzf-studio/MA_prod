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
    // Анимация при прокрутке (reveal)
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });
    revealElements.forEach(el => observer.observe(el));

    // Обработка формы обратной связи
    const form = document.getElementById('feedbackForm');
    const statusDiv = document.getElementById('formStatus');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value.trim()
            };
            
            if (!formData.name || !formData.email || !formData.message) {
                statusDiv.style.color = '#b33';
                statusDiv.innerText = 'Пожалуйста, заполните обязательные поля (имя, email, сообщение).';
                return;
            }
            
            if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
                statusDiv.style.color = '#b33';
                statusDiv.innerText = 'Введите корректный email адрес.';
                return;
            }
            
            statusDiv.style.color = '#2c6e2c';
            statusDiv.innerText = 'Отправка...';
            
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    statusDiv.innerText = 'Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.';
                    form.reset();
                    setTimeout(() => statusDiv.innerText = '', 5000);
                } else {
                    throw new Error(result.error || 'Ошибка сервера');
                }
            } catch (error) {
                console.error('Ошибка отправки формы:', error);
                statusDiv.style.color = '#b33';
                statusDiv.innerText = 'Произошла ошибка. Пожалуйста, попробуйте позже или позвоните нам.';
            }
        });
    }
    
    // DROPDOWN ЛОГИКА
    const dropdown = document.getElementById('contactDropdown');
    const toggleBtn = document.getElementById('dropdownToggleBtn');
    const menu = document.getElementById('dropdownMenu');

    if (dropdown && toggleBtn && menu) {
        function closeDropdown() { menu.classList.remove('show'); }
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
});