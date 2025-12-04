// admin.js - Основная логика админ-панели MA Furniture
class AdminPanel {
    constructor() {
        this.products = [];
        this.sections = [];
        this.currentProductId = null;
        this.currentSectionId = null;
        this.productToDelete = null;
        this.sectionToDelete = null;
        this.initialized = false;
        this.apiBaseUrl = '/api';
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        console.log('AdminPanel: Starting initialization...');
        
        try {
            // Проверяем авторизацию
            const isAuthenticated = await this.checkAuth();
            
            if (!isAuthenticated) {
                console.log('AdminPanel: Not authenticated, redirecting to login');
                window.location.href = '/admin/login.html';
                return;
            }
            
            console.log('AdminPanel: Authentication successful');
            
            // Инициализируем панель
            await this.setupPanel();
            this.initialized = true;
            
        } catch (error) {
            console.error('AdminPanel: Initialization error:', error);
            window.location.href = '/admin/login.html';
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.valid === true;
            }
            return false;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    async setupPanel() {
        console.log('AdminPanel: Setting up panel...');
        
        // Скрываем индикатор загрузки
        this.hideLoading();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Загружаем данные
        await this.loadData();
        
        console.log('AdminPanel: Panel setup completed');
    }

    hideLoading() {
        const loadingElement = document.getElementById('pageLoading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    // 🔐 Уведомления
    showNotification(message, type = 'info') {
        // Удаляем старые уведомления
        const oldNotifications = document.querySelectorAll('.notification');
        oldNotifications.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
                ${message}
            </div>
        `;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        console.log('AdminPanel: Setting up event listeners...');
        
        // Табы
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Кнопка добавления товара
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.openProductModal();
        });

        // Кнопка добавления раздела
        document.getElementById('addSectionBtn')?.addEventListener('click', () => {
            this.openSectionModal();
        });

        // Кнопка обновления
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadData();
        });

        // Закрытие модальных окон
        document.getElementById('modalClose')?.addEventListener('click', () => {
            this.closeModal('productModal');
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeModal('productModal');
        });

        document.getElementById('sectionModalClose')?.addEventListener('click', () => {
            this.closeModal('sectionModal');
        });

        document.getElementById('cancelSectionBtn')?.addEventListener('click', () => {
            this.closeModal('sectionModal');
        });

        // Форма товара
        document.getElementById('productForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Форма раздела
        document.getElementById('sectionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSection();
        });

        // Выбор бейджа
        document.querySelectorAll('.badge-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('productBadge').value = option.dataset.badge;
            });
        });

        // Загрузка изображений
        document.getElementById('uploadImagesBtn')?.addEventListener('click', () => {
            document.getElementById('productImages').click();
        });

        document.getElementById('productImages')?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });

        // Подтверждение удаления
        document.getElementById('confirmDelete')?.addEventListener('click', () => {
            this.confirmDeleteProduct();
        });

        document.getElementById('cancelDelete')?.addEventListener('click', () => {
            this.closeModal('confirmModal');
        });

        document.getElementById('confirmSectionDelete')?.addEventListener('click', () => {
            this.confirmDeleteSection();
        });

        document.getElementById('cancelSectionDelete')?.addEventListener('click', () => {
            this.closeModal('sectionConfirmModal');
        });

        // Обработчик для нескольких цветов
        document.getElementById('enableMultipleColors')?.addEventListener('change', (e) => {
            const colorsContainer = document.getElementById('colorsContainer');
            colorsContainer.style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                this.renderColorVariants();
            }
        });

        // Кнопка добавления цвета
        document.getElementById('addColorBtn')?.addEventListener('click', () => {
            this.addColorVariant();
        });

        // Кнопка выхода
        this.createLogoutButton();
    }

    createLogoutButton() {
        const header = document.querySelector('.admin-header');
        if (header) {
            // Удаляем старую кнопку если есть
            const oldBtn = document.getElementById('logoutBtn');
            if (oldBtn) oldBtn.remove();
            
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'btn btn-outline';
            logoutBtn.id = 'logoutBtn';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Выйти';
            logoutBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    window.location.href = '/admin/login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = '/admin/login.html';
                }
            });
            
            const actionsDiv = header.querySelector('.admin-actions');
            if (actionsDiv) {
                actionsDiv.appendChild(logoutBtn);
            }
        }
    }

    switchTab(tabName) {
        // Скрыть все табы
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Показать выбранный таб
        const tabElement = document.getElementById(tabName + 'Tab');
        if (tabElement) {
            tabElement.classList.add('active');
        }
        
        // Обновить активную кнопку таба
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    async loadData() {
        try {
            // Загружаем товары
            const productsResponse = await fetch('/api/products', {
                credentials: 'include'
            });
            
            if (!productsResponse.ok) {
                throw new Error(`Failed to load products: ${productsResponse.status}`);
            }
            
            this.products = await productsResponse.json();
            
            // Загружаем разделы
            const sectionsResponse = await fetch('/api/sections', {
                credentials: 'include'
            });
            
            if (!sectionsResponse.ok) {
                throw new Error(`Failed to load sections: ${sectionsResponse.status}`);
            }
            
            this.sections = await sectionsResponse.json();

            this.renderProducts();
            this.renderSections();
            
            this.showNotification('Данные загружены', 'success');
            
        } catch (error) {
            console.error('Load data error:', error);
            this.showNotification('Ошибка загрузки данных: ' + error.message, 'error');
        }
    }

    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => {
            const colorVariants = product.multiple_colors ? product.color_variants : [];
            
            const colorsInfo = product.multiple_colors ? 
                `<small style="color: #666;">${colorVariants.length} цветов</small>` : 
                '';
            
            return `
                <tr>
                    <td>${product.id}</td>
                    <td>
                        <div class="product-with-image">
                            ${product.images && product.images.length > 0 ? 
                                `<img src="${product.images[0]}" alt="${product.name}" class="product-image-small">` : 
                                '<div class="product-image-small" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;"><i class="fas fa-cube"></i></div>'
                            }
                            <div>
                                ${product.name}
                                ${colorsInfo}
                            </div>
                        </div>
                    </td>
                    <td>${this.getSectionName(product.section)}</td>
                    <td>${parseInt(product.price).toLocaleString()} ₽</td>
                    <td>${product.badge || '-'}</td>
                    <td>${product.multiple_colors ? `${colorVariants.length} вариантов` : '-'}</td>
                    <td>
                        <span class="status-badge ${product.active ? 'active' : 'inactive'}">
                            ${product.active ? 'Активен' : 'Неактивен'}
                        </span>
                    </td>
                    <td>
                        <div class="product-actions">
                            <button class="btn-edit" onclick="adminPanel.editProduct(${product.id})">
                                <i class="fas fa-edit"></i> Изменить
                            </button>
                            <button class="btn-delete" onclick="adminPanel.deleteProduct(${product.id})">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                            ${product.multiple_colors ? `
                            <button class="btn-view" onclick="adminPanel.viewColorVariants(${product.id})">
                                <i class="fas fa-palette"></i> Цвета
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const counter = document.getElementById('productCounter');
        if (counter) {
            const activeCount = this.products.filter(p => p.active).length;
            counter.textContent = `Товаров: ${activeCount}/${this.products.length}`;
        }
    }

    renderSections() {
        const tbody = document.getElementById('sectionsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.sections.map(section => `
            <tr>
                <td>${section.id}</td>
                <td>${section.name}</td>
                <td>${section.code}</td>
                <td>${section.product_count || 0}</td>
                <td>
                    <span class="status-badge ${section.active ? 'active' : 'inactive'}">
                        ${section.active ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <div class="product-actions">
                        <button class="btn-edit" onclick="adminPanel.editSection(${section.id})">
                            <i class="fas fa-edit"></i> Изменить
                        </button>
                        <button class="btn-delete" onclick="adminPanel.deleteSection(${section.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const counter = document.getElementById('sectionsCounter');
        if (counter) {
            counter.textContent = `Разделов: ${this.sections.length}`;
        }
    }

    getSectionName(sectionCode) {
        const section = this.sections.find(s => s.code === sectionCode);
        return section ? section.name : sectionCode;
    }

    openProductModal(product = null) {
        this.currentProductId = product ? product.id : null;
        const modal = document.getElementById('productModal');
        const title = document.getElementById('modalTitle');
        
        if (product) {
            title.textContent = 'Редактировать товар';
            this.fillProductForm(product);
        } else {
            title.textContent = 'Добавить товар';
            this.resetProductForm();
        }
        
        this.renderSectionOptions();
        modal.classList.add('active');
    }

    openSectionModal(section = null) {
        this.currentSectionId = section ? section.id : null;
        const modal = document.getElementById('sectionModal');
        const title = document.getElementById('sectionModalTitle');
        
        if (section) {
            title.textContent = 'Редактировать раздел';
            this.fillSectionForm(section);
        } else {
            title.textContent = 'Добавить раздел';
            this.resetSectionForm();
        }
        
        modal.classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        this.currentProductId = null;
        this.currentSectionId = null;
    }

    resetProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productBadge').value = '';
        document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
        const emptyBadge = document.querySelector('.badge-option[data-badge=""]');
        if (emptyBadge) emptyBadge.classList.add('selected');
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('enableMultipleColors').checked = false;
        document.getElementById('colorsContainer').style.display = 'none';
        document.getElementById('colorsVariantsList').innerHTML = '';
    }

    resetSectionForm() {
        document.getElementById('sectionForm').reset();
        document.getElementById('sectionId').value = '';
    }

    fillProductForm(product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productSection').value = product.section;
        document.getElementById('productSku').value = product.sku || '';
        document.getElementById('productStock').value = product.stock || 0;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productFeatures').value = Array.isArray(product.features) ? 
            product.features.join('\n') : (product.features || '');
        document.getElementById('productSpecifications').value = typeof product.specifications === 'object' ? 
            Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join('\n') : 
            (product.specifications || '');
        document.getElementById('productActive').checked = product.active !== false;
        document.getElementById('productFeatured').checked = product.featured || false;
        
        // Бейдж
        document.getElementById('productBadge').value = product.badge || '';
        document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
        const badgeOption = document.querySelector(`.badge-option[data-badge="${product.badge || ''}"]`);
        if (badgeOption) badgeOption.classList.add('selected');
        
        // Обработка нескольких цветов
        const isMultiColor = product.multiple_colors || false;
        document.getElementById('enableMultipleColors').checked = isMultiColor;
        
        const colorsContainer = document.getElementById('colorsContainer');
        colorsContainer.style.display = isMultiColor ? 'block' : 'none';
        
        if (isMultiColor && product.color_variants) {
            this.renderColorVariants(product.color_variants);
        }
        
        // Изображения
        this.renderImagePreview(product.images || []);
    }

    fillSectionForm(section) {
        document.getElementById('sectionId').value = section.id;
        document.getElementById('sectionName').value = section.name;
        document.getElementById('sectionCode').value = section.code;
        document.getElementById('sectionActive').checked = section.active !== false;
    }

    renderSectionOptions() {
        const select = document.getElementById('productSection');
        select.innerHTML = '<option value="">Выберите раздел</option>' +
            this.sections.filter(s => s.active).map(section => 
                `<option value="${section.code}">${section.name}</option>`
            ).join('');
    }

    renderImagePreview(images) {
        const container = document.getElementById('imagePreview');
        if (!images || images.length === 0) {
            container.innerHTML = '<div class="no-images">Нет изображений</div>';
            return;
        }

        container.innerHTML = images.map((image, index) => `
            <div class="preview-item">
                <img src="${image}" alt="Preview ${index + 1}">
                <button type="button" class="remove-image" onclick="adminPanel.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        // Добавляем счетчик
        const counter = document.createElement('div');
        counter.className = 'image-counter';
        counter.textContent = `${images.length}/5 изображений`;
        container.appendChild(counter);
    }

    handleImageUpload(files) {
        const currentImages = this.getCurrentImages();
        
        // Проверяем лимит
        if (!this.validateImageCount(currentImages, Array.from(files))) {
            return;
        }
        
        const images = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    images.push(e.target.result);
                    if (images.length === files.length) {
                        this.addImagesToPreview(images);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }

    addImagesToPreview(newImages) {
        const container = document.getElementById('imagePreview');
        const currentImages = this.getCurrentImages();
        const allImages = [...currentImages, ...newImages];
        
        this.renderImagePreview(allImages);
    }

    removeImage(index) {
        const currentImages = this.getCurrentImages();
        currentImages.splice(index, 1);
        this.renderImagePreview(currentImages);
    }

    getCurrentImages() {
        const container = document.getElementById('imagePreview');
        if (!container) return [];
        
        const images = Array.from(container.querySelectorAll('img')).map(img => img.src);
        return images.filter(img => !img.includes('data:image/svg')); // Исключаем счетчик
    }

    // Рендер контейнера цветов
    renderColorVariants(colors = []) {
        const container = document.getElementById('colorsVariantsList');
        container.innerHTML = '';

        if (colors.length === 0) {
            // Создаем один цвет по умолчанию
            this.addColorVariant();
            return;
        }

        colors.forEach((color, index) => {
            const colorElement = this.createColorVariantElement(color, index);
            container.appendChild(colorElement);
        });
    }

    // Создание элемента цвета
    createColorVariantElement(colorData, index) {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-variant-item';
        colorDiv.innerHTML = `
            <div class="color-variant-header">
                <h4>Цвет ${index + 1}</h4>
                <button type="button" class="btn-remove-color" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="color-variant-content">
                <div class="form-group">
                    <label>Название цвета</label>
                    <input type="text" class="color-name" value="${colorData.name || `Цвет ${index + 1}`}" 
                           placeholder="Например: Бежевый, Серебристый">
                </div>
                
                <div class="form-group">
                    <label>Выберите цвет</label>
                    <div class="color-palette-selector">
                        ${this.generateColorPalette(colorData.hex || '#cccccc')}
                    </div>
                    <input type="color" class="color-picker" value="${colorData.hex || '#cccccc'}" 
                           style="margin-top: 5px;">
                </div>
            </div>
        `;

        // Обработчики событий для этого цвета
        this.attachColorVariantEventListeners(colorDiv, index);
        return colorDiv;
    }

    // Генерация палитры цветов
    generateColorPalette(selectedColor) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
            '#F1948A', '#85C1E9', '#D7BDE2', '#F9E79F', '#A9DFBF', '#F5B7B1',
            '#cccccc', '#666666', '#333333', '#000000', '#ffffff'
        ];

        return colors.map(color => `
            <div class="color-option ${color === selectedColor ? 'selected' : ''}" 
                 style="background-color: ${color}" 
                 data-color="${color}" 
                 title="${color}">
                ${color === selectedColor ? '<i class="fas fa-check"></i>' : ''}
            </div>
        `).join('');
    }

    // Добавление обработчиков для варианта цвета
    attachColorVariantEventListeners(colorElement, index) {
        // Выбор цвета из палитры
        colorElement.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                const color = option.dataset.color;
                colorElement.querySelector('.color-picker').value = color;
                colorElement.querySelectorAll('.color-option').forEach(opt => 
                    opt.classList.remove('selected')
                );
                option.classList.add('selected');
                option.innerHTML = '<i class="fas fa-check"></i>';
            });
        });

        // Кастомный выбор цвета
        const colorPicker = colorElement.querySelector('.color-picker');
        colorPicker.addEventListener('change', (e) => {
            const newColor = e.target.value;
            colorElement.querySelectorAll('.color-option').forEach(opt => 
                opt.classList.remove('selected')
            );
            
            // Найти ближайший цвет в палитре или показать, что выбран кастомный
            const customOption = Array.from(colorElement.querySelectorAll('.color-option'))
                .find(opt => opt.dataset.color === newColor);
            
            if (customOption) {
                customOption.classList.add('selected');
                customOption.innerHTML = '<i class="fas fa-check"></i>';
            }
        });

        // Удаление цвета
        const removeBtn = colorElement.querySelector('.btn-remove-color');
        removeBtn.addEventListener('click', () => {
            this.removeColorVariant(index);
        });
    }

    // Добавление нового цвета
    addColorVariant() {
        const container = document.getElementById('colorsVariantsList');
        const colorCount = container.children.length;
        
        if (colorCount >= 10) {
            this.showNotification('Максимум 10 цветов', 'error');
            return;
        }

        const newColor = {
            name: `Цвет ${colorCount + 1}`,
            hex: this.getRandomColor()
        };

        const colorElement = this.createColorVariantElement(newColor, colorCount);
        container.appendChild(colorElement);
    }

    // Удаление цвета
    removeColorVariant(index) {
        const container = document.getElementById('colorsVariantsList');
        const colorCount = container.children.length;
        
        if (colorCount <= 1) {
            this.showNotification('Должен остаться хотя бы один цвет', 'error');
            return;
        }

        container.children[index].remove();
        
        // Обновляем индексы оставшихся элементов
        Array.from(container.children).forEach((child, newIndex) => {
            const header = child.querySelector('h4');
            header.textContent = `Цвет ${newIndex + 1}`;
            
            const removeBtn = child.querySelector('.btn-remove-color');
            removeBtn.dataset.index = newIndex;
        });
    }

    // Получение случайного цвета
    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Получение данных о цветах из формы
    getColorVariantsData() {
        const colorVariants = [];
        const colorElements = document.querySelectorAll('.color-variant-item');
        
        colorElements.forEach((element, index) => {
            const name = element.querySelector('.color-name').value;
            const hex = element.querySelector('.color-picker').value;
            
            colorVariants.push({
                name: name,
                hex: hex,
                index: index + 1
            });
        });
        
        return colorVariants;
    }

    // Ограничение на количество изображений
    validateImageCount(currentImages, newImages, maxCount = 5) {
        const total = currentImages.length + newImages.length;
        if (total > maxCount) {
            this.showNotification(`Максимум ${maxCount} изображений`, 'error');
            return false;
        }
        return true;
    }

    getProductFormData() {
        const formData = {
            name: document.getElementById('productName').value,
            price: parseInt(document.getElementById('productPrice').value),
            section: document.getElementById('productSection').value,
            sku: document.getElementById('productSku').value,
            stock: parseInt(document.getElementById('productStock').value) || 0,
            description: document.getElementById('productDescription').value,
            features: this.parseFeatures(document.getElementById('productFeatures').value),
            specifications: this.parseSpecifications(document.getElementById('productSpecifications').value),
            badge: document.getElementById('productBadge').value,
            active: document.getElementById('productActive').checked,
            featured: document.getElementById('productFeatured').checked,
            images: this.getCurrentImages(),
            multiple_colors: document.getElementById('enableMultipleColors').checked,
            color_variants: document.getElementById('enableMultipleColors').checked ? this.getColorVariantsData() : []
        };

        return formData;
    }

    getSectionFormData() {
        return {
            name: document.getElementById('sectionName').value,
            code: document.getElementById('sectionCode').value,
            active: document.getElementById('sectionActive').checked
        };
    }

    parseFeatures(featuresText) {
        return featuresText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    parseSpecifications(specsText) {
        const specifications = {};
        const lines = specsText.split('\n');
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                specifications[key.trim()] = valueParts.join(':').trim();
            }
        });
        
        return specifications;
    }

    async saveProduct() {
        try {
            const formData = this.getProductFormData();
            
            if (!formData.name || !formData.price || !formData.section) {
                this.showNotification('Заполните все обязательные поля', 'error');
                return;
            }

            let url, method;
            if (this.currentProductId) {
                url = `/api/admin/products/${this.currentProductId}`;
                method = 'PUT';
            } else {
                url = '/api/admin/products';
                method = 'POST';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showNotification('Товар успешно сохранен', 'success');
                await this.loadData();
                this.closeModal('productModal');
            } else {
                const error = await response.json();
                this.showNotification(`Ошибка сохранения товара: ${error.error}`, 'error');
            }

        } catch (error) {
            console.error('Save product error:', error);
            this.showNotification('Ошибка сохранения товара', 'error');
        }
    }

    async saveSection() {
        try {
            const formData = this.getSectionFormData();
            
            if (!formData.name || !formData.code) {
                this.showNotification('Заполните все поля', 'error');
                return;
            }

            let url, method;
            if (this.currentSectionId) {
                url = `/api/admin/sections/${this.currentSectionId}`;
                method = 'PUT';
            } else {
                url = '/api/admin/sections';
                method = 'POST';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showNotification('Раздел успешно сохранен', 'success');
                await this.loadData();
                this.closeModal('sectionModal');
            } else {
                const error = await response.json();
                this.showNotification(`Ошибка сохранения раздела: ${error.error}`, 'error');
            }

        } catch (error) {
            console.error('Save section error:', error);
            this.showNotification('Ошибка сохранения раздела', 'error');
        }
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.openProductModal(product);
        }
    }

    editSection(id) {
        const section = this.sections.find(s => s.id === id);
        if (section) {
            this.openSectionModal(section);
        }
    }

    deleteProduct(id) {
        this.productToDelete = id;
        document.getElementById('confirmModal').classList.add('active');
    }

    async confirmDeleteProduct() {
        if (this.productToDelete) {
            try {
                const response = await fetch(`/api/admin/products/${this.productToDelete}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    this.showNotification('Товар удален', 'success');
                    await this.loadData();
                } else {
                    const error = await response.json();
                    this.showNotification(`Ошибка удаления товара: ${error.error}`, 'error');
                }
                
            } catch (error) {
                this.showNotification('Ошибка удаления товара', 'error');
            }
            this.productToDelete = null;
        }
        this.closeModal('confirmModal');
    }

    deleteSection(id) {
        this.sectionToDelete = id;
        const section = this.sections.find(s => s.id === id);
        const message = document.getElementById('sectionConfirmMessage');
        if (message && section) {
            message.textContent = `Вы уверены, что хотите удалить раздел "${section.name}"?`;
        }
        document.getElementById('sectionConfirmModal').classList.add('active');
    }

    async confirmDeleteSection() {
        if (this.sectionToDelete) {
            try {
                const response = await fetch(`/api/admin/sections/${this.sectionToDelete}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    this.showNotification('Раздел удален', 'success');
                    await this.loadData();
                } else {
                    const error = await response.json();
                    this.showNotification(`Ошибка удаления раздела: ${error.error}`, 'error');
                }
                
            } catch (error) {
                this.showNotification('Ошибка удаления раздела', 'error');
            }
            this.sectionToDelete = null;
        }
        this.closeModal('sectionConfirmModal');
    }

    viewColorVariants(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.multiple_colors) return;
        
        const variants = product.color_variants || [];
        
        let message = `Варианты цветов для товара "${product.name}":\n\n`;
        variants.forEach(variant => {
            message += `• ${variant.name} (${variant.hex})\n`;
        });
        
        alert(message);
    }
}

// Инициализация только для админ-панели
let adminPanel;

// Проверяем, что мы на странице админ-панели
if (window.location.pathname.includes('/admin') && 
    !window.location.pathname.includes('/admin/login.html')) {
    
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('DOM loaded, initializing AdminPanel...');
        
        try {
            adminPanel = new AdminPanel();
            await adminPanel.initialize();
            
            // Делаем панель доступной глобально
            window.adminPanel = adminPanel;
        } catch (error) {
            console.error('Failed to initialize admin panel:', error);
            window.location.href = '/admin/login.html';
        }
    });
}