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
        this.loadBackupList();
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
            if (!response.ok) window.location.href = '/admin';
        } catch (error) {
            window.location.href = '/admin';
        }
    }
    
    async loadBackupList() {
        try {
            const res = await fetch(`${this.API_BASE}/api/admin/backup/list`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await res.json();
            const listDiv = document.getElementById('backupList');
            if (!listDiv) return;
            if (data.success && data.backups.length) {
                listDiv.innerHTML = data.backups.map(b => `
                    <div class="backup-item" data-filename="${b.filename}">
                        <i class="fas fa-file-archive"></i>
                        <span>${b.filename}</span>
                        <span>${(b.size/1024/1024).toFixed(2)} MB</span>
                        <span>${new Date(b.created).toLocaleString()}</span>
                        <button class="btn btn-sm btn-danger delete-backup" data-filename="${b.filename}"><i class="fas fa-trash"></i> Удалить</button>
                    </div>
                `).join('');
                document.querySelectorAll('.delete-backup').forEach(btn => {
                    btn.addEventListener('click', () => this.deleteBackup(btn.dataset.filename));
                });
            } else {
                listDiv.innerHTML = '<p>Нет сохранённых бэкапов</p>';
            }
        } catch(e) {
            console.error(e);
            const listDiv = document.getElementById('backupList');
            if (listDiv) listDiv.innerHTML = '<p>Ошибка загрузки списка бэкапов</p>';
        }
    }
    
    async deleteBackup(filename) {
        if (!confirm(`Удалить бэкап ${filename}?`)) return;
        try {
            const res = await fetch(`${this.API_BASE}/api/admin/backup/delete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                window.showNotification('Бэкап удалён');
                this.loadBackupList();
            } else {
                window.showNotification(data.error, 'error');
            }
        } catch(e) {
            window.showNotification('Ошибка удаления', 'error');
        }
    }
    
    initEventListeners() {
        const downloadBtn = document.getElementById('downloadBackupBtn');
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadBackup());
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('backupFile');
        const selectFileBtn = document.getElementById('selectFileBtn');
        const clearFileBtn = document.getElementById('clearFileBtn');
        const uploadBtn = document.getElementById('uploadBackupBtn');
        if (selectFileBtn && fileInput) selectFileBtn.addEventListener('click', () => fileInput.click());
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) this.handleFile(files[0]);
            });
        }
        if (clearFileBtn) clearFileBtn.addEventListener('click', () => this.clearFile());
        if (uploadBtn) uploadBtn.addEventListener('click', () => this.uploadBackup());
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) this.handleFile(files[0]);
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
        if (uploadBtn) uploadBtn.disabled = false;
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
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            let filename = 'ma_furniture_backup.zip';
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) filename = match[1].replace(/['"]/g, '');
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this.showMessage('downloadMessage', 'Бэкап успешно скачан', 'success');
            this.loadBackupList(); // обновить список
        } catch (error) {
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
                this.clearFile();
                setTimeout(() => {
                    if (confirm('База данных восстановлена. Перезагрузить страницу?')) window.location.reload();
                }, 1000);
            } else {
                throw new Error(data.error || 'Ошибка восстановления');
            }
        } catch (error) {
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
        setTimeout(() => { if (msgDiv.innerHTML === `<div class="message ${type}">${text}</div>`) msgDiv.innerHTML = ''; }, 5000);
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('admin_token');
            window.location.href = '/admin';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.adminBackup = new AdminBackupManager(); });