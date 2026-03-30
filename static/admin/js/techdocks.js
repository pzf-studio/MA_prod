// Скрипт для страницы технической документации
document.addEventListener('DOMContentLoaded', function() {
    // Подсветка активного пункта навигации
    const sections = document.querySelectorAll('.docs-section');
    const navLinks = document.querySelectorAll('.docs-nav a');
    const searchInput = document.getElementById('docsSearch');

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) activeSection.classList.add('active');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
            // Плавный скролл к началу контента
            document.querySelector('.docs-content').scrollTop = 0;
        });
    });

    // Поиск по документации
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query.length < 2) {
                // Показать все секции, но без подсветки
                document.querySelectorAll('.docs-section').forEach(section => {
                    section.style.display = '';
                });
                return;
            }
            document.querySelectorAll('.docs-section').forEach(section => {
                const text = section.innerText.toLowerCase();
                if (text.includes(query)) {
                    section.style.display = '';
                    // Подсветка найденных слов (простая, без mark)
                    // Можно реализовать более сложную подсветку, но для простоты оставим так
                } else {
                    section.style.display = 'none';
                }
            });
            // Автоматически показываем первую видимую секцию
            const firstVisible = document.querySelector('.docs-section[style*="display: block"], .docs-section:not([style*="display: none"])');
            if (firstVisible && !firstVisible.classList.contains('active')) {
                const id = firstVisible.getAttribute('id');
                showSection(id);
            }
        });
    }

    // Обработка якоря в URL при загрузке
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        if (document.getElementById(sectionId)) {
            showSection(sectionId);
        }
    }
});