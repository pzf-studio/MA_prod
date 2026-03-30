class AdminDashboard {
    constructor() {
        this.apiBase = window.location.origin;
        this.token = localStorage.getItem('admin_token');
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadStats();
        await this.loadActivity();
        await this.loadPopularProducts();
        await this.loadBackgroundPreview();
        await this.loadMaintenanceStatus();
        this.startRealTimeUpdates();
        this.attachEvents();
    }

    async checkAuth() {
        if (!this.token) return window.location.href = '/admin';
        try {
            const res = await fetch(`${this.apiBase}/api/admin/verify`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            if (!res.ok) window.location.href = '/admin';
        } catch(e) { window.location.href = '/admin'; }
    }

    async loadStats() {
        try {
            const res = await fetch(`${this.apiBase}/api/admin/dashboard/stats`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            if (data.success) {
                document.getElementById('totalProducts').innerText = data.stats.total_products;
                document.getElementById('totalCategories').innerText = data.stats.active_sections;
                document.getElementById('backgroundStatusText').innerText = data.stats.background_exists ? 'Установлен' : 'Нет';
                document.getElementById('productsBadge').innerText = data.stats.total_products;
                document.getElementById('categoriesBadge').innerText = data.stats.active_sections;
            }
        } catch(e) { console.error(e); }
    }

    async loadActivity() {
        try {
            const res = await fetch(`${this.apiBase}/api/admin/dashboard/activity`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            const container = document.getElementById('activityFeed');
            if (data.success && data.activity.length) {
                container.innerHTML = data.activity.map(act => `
                    <div class="activity-item">
                        <div class="activity-icon"><i class="${act.icon || 'fas fa-clock'}"></i></div>
                        <div class="activity-content">
                            <h4>${act.title}</h4>
                            <p>${act.description}</p>
                            <div class="activity-time"><i class="fas fa-clock"></i> ${act.time}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="activity-item">Нет активности</div>';
            }
        } catch(e) { console.error(e); }
    }

    async loadPopularProducts() {
        try {
            const res = await fetch(`${this.apiBase}/api/admin/dashboard/popular-products`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            const container = document.getElementById('popularProducts');
            if (data.success && data.products.length) {
                container.innerHTML = data.products.map(p => `
                    <div class="popular-product">
                        <img src="${p.images?.[0] || ''}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ccc%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">
                        <div><h4>${p.name}</h4><p>${window.formatPrice(p.price)}</p></div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p>Нет популярных товаров</p>';
            }
        } catch(e) { console.error(e); }
    }

    async loadBackgroundPreview() {
        try {
            const res = await fetch(`${this.apiBase}/api/media/background`);
            const data = await res.json();
            const container = document.getElementById('backgroundPreview');
            if (data.success && data.background && data.background.image_url) {
                container.innerHTML = `<img src="${data.background.image_url}" style="max-width:100%; max-height:150px; border-radius:8px;">`;
            } else {
                container.innerHTML = '<div class="no-background-message"><i class="fas fa-image"></i><p>Фон не установлен</p></div>';
            }
        } catch(e) { console.error(e); }
    }

    async loadMaintenanceStatus() {
        try {
            const res = await fetch(`${this.apiBase}/api/admin/maintenance/status`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            const enabled = data.enabled;
            const statusSpan = document.getElementById('maintenanceStatus');
            const statusText = document.getElementById('maintenanceStatusText');
            const toggleBtn = document.getElementById('maintenanceToggle');
            if (enabled) {
                statusSpan.innerText = 'Включён';
                statusSpan.className = 'badge badge-danger';
                statusText.innerText = 'Сайт временно недоступен для посетителей.';
                toggleBtn.innerHTML = '<i class="fas fa-play-circle"></i> Выключить режим';
                toggleBtn.classList.remove('btn-warning');
                toggleBtn.classList.add('btn-success');
            } else {
                statusSpan.innerText = 'Выключен';
                statusSpan.className = 'badge badge-success';
                statusText.innerText = 'Сайт работает в обычном режиме.';
                toggleBtn.innerHTML = '<i class="fas fa-tools"></i> Включить режим';
                toggleBtn.classList.remove('btn-success');
                toggleBtn.classList.add('btn-warning');
            }
        } catch(e) { console.error(e); }
    }

    async updateOnlineCount() {
        try {
            const res = await fetch(`${this.apiBase}/api/admin/online/count`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            if (data.success) document.getElementById('onlineCount').innerText = data.count;
        } catch(e) { console.error(e); }
    }

    startRealTimeUpdates() {
        this.updateOnlineCount();
        setInterval(() => this.updateOnlineCount(), 10000);
        setInterval(() => this.loadStats(), 30000);
        setInterval(() => this.loadActivity(), 60000);
    }

    attachEvents() {
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Вы уверены, что хотите выйти?')) {
                localStorage.removeItem('admin_token');
                window.location.href = '/admin';
            }
        });
        document.getElementById('maintenanceToggle').addEventListener('click', async () => {
            const res = await fetch(`${this.apiBase}/api/admin/maintenance/status`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const { enabled } = await res.json();
            const url = enabled ? '/api/admin/maintenance/disable' : '/api/admin/maintenance/enable';
            const response = await fetch(`${this.apiBase}${url}`, { method: 'POST', headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await response.json();
            if (data.success) {
                window.showNotification(data.message);
                this.loadMaintenanceStatus();
            } else {
                window.showNotification(data.error, 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.adminDashboard = new AdminDashboard(); });