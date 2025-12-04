// static/js/auth.js
class AdminAuth {
    constructor() {
        this.tokenKey = 'admin_token';
        this.userKey = 'admin_user';
        this.loginPage = '/admin/login.html'; // Создайте страницу входа
    }

    async checkAuthStatus() {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return false;
        }

        try {
            // Проверяем токен на сервере
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    redirectToLogin() {
        // Проверяем, не находимся ли уже на странице входа
        if (!window.location.pathname.includes('login')) {
            window.location.href = this.loginPage;
        }
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.redirectToLogin();
    }

    // Метод для входа
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(this.tokenKey, data.token);
                localStorage.setItem(this.userKey, JSON.stringify(data.user));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр
const adminAuth = new AdminAuth();