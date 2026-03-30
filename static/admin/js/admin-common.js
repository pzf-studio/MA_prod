// Общие утилиты для админки
window.showNotification = function(message, type = 'success', duration = 3000) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
};

window.formatPrice = function(price) {
    if (price === undefined || price === null) price = 0;
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(price);
};

window.formatDate = function(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

window.getAuthHeaders = function() {
    const token = localStorage.getItem('admin_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

// Инициализация боковой панели
document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
    
    // Подсветка активного пункта меню
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-item a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (currentPath.endsWith(href) || (href === 'admin-dashboard.html' && currentPath.endsWith('/admin/dashboard')))) {
            link.closest('.nav-item').classList.add('active');
        }
    });
});