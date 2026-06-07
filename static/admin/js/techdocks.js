document.addEventListener('DOMContentLoaded', function() {
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
            document.querySelector('.docs-content').scrollTop = 0;
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query.length < 2) {
                document.querySelectorAll('.docs-section').forEach(section => {
                    section.style.display = '';
                });
                return;
            }
            document.querySelectorAll('.docs-section').forEach(section => {
                const text = section.innerText.toLowerCase();
                if (text.includes(query)) {
                    section.style.display = '';
                } else {
                    section.style.display = 'none';
                }
            });
            const firstVisible = document.querySelector('.docs-section[style*="display: block"], .docs-section:not([style*="display: none"])');
            if (firstVisible && !firstVisible.classList.contains('active')) {
                const id = firstVisible.getAttribute('id');
                showSection(id);
            }
        });
    }

    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        if (document.getElementById(sectionId)) {
            showSection(sectionId);
        }
    }
});