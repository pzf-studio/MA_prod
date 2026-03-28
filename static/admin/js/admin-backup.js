class AdminBackupManager {
    constructor() {
        this.API_BASE = window.location.origin;
        this.authToken = localStorage.getItem('admin_token');
        this.selectedFile = null;
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        this.initEventListeners();
    }
    
    async checkAuth() {
        if (!this.authToken) {
            window.location.href = '/admin';
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/verify`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (!response.ok) {
                window.location.href = '/admin';
            }
        } catch (error) {
            window.location.href = '/admin';
        }
    }
    
    initEventListeners() {
        // Кнопка скачивания
        const downloadBtn = document.getElementById('downloadBackupBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadBackup());
        }
        
        // Загрузка файла
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('backupFile');
        const selectFileBtn = document.getElementById('selectFileBtn');
        const clearFileBtn = document.getElementById('clearFileBtn');
        const uploadBtn = document.getElementById('uploadBackupBtn');
        
        if (selectFileBtn && fileInput) {
            selectFileBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }
        
        if (clearFileBtn) {
            clearFileBtn.addEventListener('click', () => this.clearFile());
        }
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadBackup());
        }
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }
    
    handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.zip')) {
            this.showMessage('uploadMessage', 'Пожалуйста, выберите ZIP-архив', 'error');
            return;
        }
        
        this.selectedFile = file;
        const fileInfo = document.getElementById('selectedFileInfo');
        const fileNameSpan = document.getElementById('fileName');
        const uploadBtn = document.getElementById('uploadBackupBtn');
        
        if (fileInfo && fileNameSpan) {
            fileNameSpan.textContent = file.name;
            fileInfo.style.display = 'flex';
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
        
        // Скрываем сообщение об ошибке, если было
        const msgDiv = document.getElementById('uploadMessage');
        if (msgDiv) msgDiv.innerHTML = '';
    }
    
    clearFile() {
        this.selectedFile = null;
        const fileInput = document.getElementById('backupFile');
        const fileInfo = document.getElementById('selectedFileInfo');
        const uploadBtn = document.getElementById('uploadBackupBtn');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadBtn) uploadBtn.disabled = true;
    }
    
    async downloadBackup() {
        const downloadBtn = document.getElementById('downloadBackupBtn');
        const messageDiv = document.getElementById('downloadMessage');
        
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подготовка...';
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/backup/download`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Ошибка ${response.status}`);
            }
            
            // Получаем blob и создаём ссылку для скачивания
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Извлекаем имя файла из Content-Disposition, если есть
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'ma_furniture_backup.zip';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    filename = match[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('downloadMessage', 'Бэкап успешно скачан', 'success');
        } catch (error) {
            console.error('Ошибка скачивания:', error);
            this.showMessage('downloadMessage', `Ошибка: ${error.message}`, 'error');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<i class="fas fa-database"></i> Скачать бэкап';
        }
    }
    
    async uploadBackup() {
        if (!this.selectedFile) {
            this.showMessage('uploadMessage', 'Файл не выбран', 'error');
            return;
        }
        
        const uploadBtn = document.getElementById('uploadBackupBtn');
        const messageDiv = document.getElementById('uploadMessage');
        
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Восстановление...';
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/backup/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.authToken}` },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('uploadMessage', data.message, 'success');
                // Очищаем выбранный файл
                this.clearFile();
                // Рекомендуем перезагрузить страницу
                setTimeout(() => {
                    if (confirm('База данных и изображения восстановлены. Перезагрузить страницу для применения изменений?')) {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                throw new Error(data.error || 'Ошибка восстановления');
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showMessage('uploadMessage', `Ошибка: ${error.message}`, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Восстановить из бэкапа';
        }
    }
    
    showMessage(elementId, text, type) {
        const msgDiv = document.getElementById(elementId);
        if (!msgDiv) return;
        
        msgDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
        
        // Автоскрытие через 5 секунд
        setTimeout(() => {
            if (msgDiv.innerHTML === `<div class="message ${type}">${text}</div>`) {
                msgDiv.innerHTML = '';
            }
        }, 5000);
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
            window.location.href = '/admin';
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.adminBackup = new AdminBackupManager();
});