document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    checkAdminAuth();
    
    // Инициализация страницы
    initializeProductsPage();
});

// Проверка авторизации администратора
function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    const session = JSON.parse(localStorage.getItem('admin_session'));
    
    if (!isLoggedIn || !session || session.username !== 'admin') {
        showNotification('Доступ запрещен. Пожалуйста, авторизуйтесь.', 'error');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 2000);
        return false;
    }
    
    return true;
}

// Инициализация страницы управления товарами
function initializeProductsPage() {
    // Загружаем товары
    loadProducts();
    
    // Обновляем счетчик товаров
    updateProductsBadge();
    
    // Инициализация кнопок
    initializeButtons();
    
    // Инициализация фильтров
    initializeFilters();
    
    // Инициализация модальных окон
    initializeModals();
    
    // Загружаем разделы
    loadSections();
}

// Загрузка товаров
let allProducts = [];
let currentPage = 1;
const itemsPerPage = 20;

function loadProducts() {
    try {
        // Загружаем товары из localStorage
        const products = JSON.parse(localStorage.getItem('products')) || [];
        allProducts = products;
        
        // Показываем товары
        renderProducts();
        
        // Обновляем пагинацию
        renderPagination();
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showNotification('Ошибка загрузки товаров', 'error');
    }
}

// Отображение товаров в таблице
function renderProducts() {
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;
    
    // Применяем фильтры и сортировку
    let filteredProducts = filterAndSortProducts();
    
    // Получаем товары для текущей страницы
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    if (productsToShow.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <h3>Товары не найдены</h3>
                    <p>${allProducts.length === 0 ? 
                        'Нет добавленных товаров. Добавьте первый товар!' : 
                        'Попробуйте изменить фильтры поиска'
                    }</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    productsToShow.forEach(product => {
        const row = document.createElement('tr');
        
        // Определяем статус
        const isActive = product.status === 'active';
        const statusToggle = `
            <div class="status-toggle ${isActive ? 'active' : ''}" 
                 onclick="toggleProductStatus(${product.id})">
            </div>
        `;
        
        // Форматируем дату
        const date = new Date(product.createdAt || product.updatedAt || Date.now());
        const formattedDate = date.toLocaleDateString('ru-RU');
        
        // Получаем URL изображения
        const imageUrl = product.images?.[0] || product.image || '';
        
        // Формируем бейдж
        let badgeHTML = '';
        if (product.badge) {
            let badgeClass = '';
            switch(product.badge) {
                case 'Новинка':
                    badgeClass = 'badge-new';
                    break;
                case 'Хит продаж':
                    badgeClass = 'badge-hit';
                    break;
                case 'Акция':
                    badgeClass = 'badge-sale';
                    break;
                default:
                    badgeClass = 'badge-new';
            }
            badgeHTML = `<span class="badge-tag ${badgeClass}">${product.badge}</span>`;
        }
        
        // Получаем название категории
        const categoryName = getCategoryName(product.category);
        
        row.innerHTML = `
            <td>${product.id || '-'}</td>
            <td class="product-image-cell">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                    ''
                }
                <div class="no-image" style="${imageUrl ? 'display: none;' : 'display: flex;'}">
                    <i class="fas fa-box"></i>
                </div>
            </td>
            <td>
                <strong>${product.name || 'Без названия'}</strong>
                <br>
                <small class="text-muted">${product.description?.substring(0, 100) || 'Без описания'}...</small>
            </td>
            <td>${categoryName}</td>
            <td>
                <strong>${formatPrice(product.price || 0)}</strong>
                ${product.oldPrice ? 
                    `<br><small class="text-muted" style="text-decoration: line-through;">${formatPrice(product.oldPrice)}</small>` : 
                    ''
                }
            </td>
            <td>${statusToggle}</td>
            <td>${badgeHTML}</td>
            <td>${formattedDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewProduct(${product.id})" title="Просмотр">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editProduct(${product.id})" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="confirmDelete(${product.id})" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Фильтрация и сортировка товаров
function filterAndSortProducts() {
    let filtered = [...allProducts];
    
    // Фильтр по категории
    const categoryFilter = document.getElementById('categoryFilter').value;
    if (categoryFilter) {
        filtered = filtered.filter(product => product.category === categoryFilter);
    }
    
    // Фильтр по статусу
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter) {
        filtered = filtered.filter(product => product.status === statusFilter);
    }
    
    // Фильтр по поиску
    const searchInput = document.getElementById('productSearch').value.toLowerCase();
    if (searchInput) {
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(searchInput) ||
            product.description?.toLowerCase().includes(searchInput) ||
            product.code?.toLowerCase().includes(searchInput)
        );
    }
    
    // Сортировка
    const sortBy = document.getElementById('sortBy').value;
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'newest':
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case 'oldest':
                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            case 'price_asc':
                return (a.price || 0) - (b.price || 0);
            case 'price_desc':
                return (b.price || 0) - (a.price || 0);
            case 'name_asc':
                return (a.name || '').localeCompare(b.name || '');
            case 'name_desc':
                return (b.name || '').localeCompare(a.name || '');
            default:
                return 0;
        }
    });
    
    return filtered;
}

// Отображение пагинации
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    // Получаем отфильтрованные товары
    let filteredProducts = filterAndSortProducts();
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Кнопка "Назад"
    html += `
        <button class="page-item ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Номера страниц
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <button class="page-item ${i === currentPage ? 'active' : ''}" 
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span class="page-item disabled">...</span>';
        }
    }
    
    // Кнопка "Вперед"
    html += `
        <button class="page-item ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = html;
}

// Изменение страницы
function changePage(page) {
    const filteredProducts = filterAndSortProducts();
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderProducts();
    renderPagination();
    
    // Прокрутка к верху таблицы
    const table = document.getElementById('productsTable');
    if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Инициализация кнопок
function initializeButtons() {
    // Кнопка добавления товара
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openProductModal();
        });
    }
    
    // Кнопки в сайдбаре
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Кнопки подменю
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('active');
            const submenu = this.nextElementSibling;
            submenu.classList.toggle('active');
        });
    });
}

// Инициализация фильтров
function initializeFilters() {
    const filters = [
        'categoryFilter',
        'statusFilter',
        'sortBy',
        'productSearch'
    ];
    
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                currentPage = 1;
                renderProducts();
                renderPagination();
            });
    }
    });
    
    // Особый обработчик для поиска
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                renderProducts();
                renderPagination();
            }, 500);
        });
    }
}

// Инициализация модальных окон
function initializeModals() {
    // Модальное окно товара
    const productModal = document.getElementById('productModal');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            productModal.classList.remove('active');
        });
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', () => {
            productModal.classList.remove('active');
        });
    }
    
    // Закрытие по клику вне модалки
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.classList.remove('active');
        }
    });
    
    // Модальное окно удаления
    const deleteModal = document.getElementById('deleteModal');
    const deleteCancel = document.getElementById('deleteCancel');
    
    if (deleteCancel) {
        deleteCancel.addEventListener('click', () => {
            deleteModal.classList.remove('active');
        });
    }
    
    // Загрузка изображений
    initializeImageUpload();
    
    // Обработчик формы
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
}

// Инициализация загрузки изображений
function initializeImageUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!uploadArea || !fileInput || !imagePreview) return;
    
    // Клик по области загрузки
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Перетаскивание файлов
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#3498db';
        uploadArea.style.backgroundColor = '#f8f9fa';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
        uploadArea.style.backgroundColor = '';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        handleImageFiles(files);
    });
    
    // Выбор файлов через диалог
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleImageFiles(files);
    });
}

// Обработка загруженных изображений
function handleImageFiles(files) {
    const imagePreview = document.getElementById('imagePreview');
    if (!imagePreview) return;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            showNotification('Пожалуйста, загружайте только изображения', 'error');
            continue;
        }
        
        // Проверяем размер файла (максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification(`Файл ${file.name} слишком большой (максимум 5MB)`, 'error');
            continue;
        }
        
        // Читаем файл
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageData = e.target.result;
            
            // Создаем элемент превью
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${imageData}" alt="Превью">
                <div class="preview-remove" onclick="removeImagePreview(this)">
                    <i class="fas fa-times"></i>
                </div>
            `;
            
            imagePreview.appendChild(previewItem);
            
            // Обновляем скрытое поле с изображениями
            updateImagesHiddenField();
        };
        
        reader.readAsDataURL(file);
    }
}

// Удаление превью изображения
function removeImagePreview(element) {
    const previewItem = element.closest('.preview-item');
    previewItem.remove();
    updateImagesHiddenField();
}

// Обновление скрытого поля с изображениями
function updateImagesHiddenField() {
    const imagePreview = document.getElementById('imagePreview');
    const imagesField = document.getElementById('productImages');
    
    if (!imagePreview || !imagesField) return;
    
    const images = [];
    const imgElements = imagePreview.querySelectorAll('img');
    
    imgElements.forEach(img => {
        images.push(img.src);
    });
    
    imagesField.value = JSON.stringify(images);
}

// Открытие модального окна товара
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal || !modalTitle || !form) return;
    
    // Очищаем форму
    form.reset();
    
    // Очищаем превью изображений
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.innerHTML = '';
    
    // Очищаем скрытые поля
    document.getElementById('productId').value = '';
    document.getElementById('productImages').value = '';
    
    if (productId) {
        // Редактирование существующего товара
        modalTitle.textContent = 'Редактировать товар';
        loadProductData(productId);
    } else {
        // Добавление нового товара
        modalTitle.textContent = 'Добавить новый товар';
    }
    
    modal.classList.add('active');
}

// Загрузка данных товара для редактирования
function loadProductData(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Заполняем форму данными товара
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCode').value = product.code || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productSection').value = product.section || '';
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productOldPrice').value = product.oldPrice || '';
    document.getElementById('productBadge').value = product.badge || '';
    document.getElementById('productRecommended').value = product.recommended || 'false';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productSpecifications').value = product.specifications || '';
    document.getElementById('productStatus').value = product.status || 'active';
    document.getElementById('productStock').value = product.stock || 10;
    
    // Загружаем изображения
    const images = product.images || (product.image ? [product.image] : []);
    const imagePreview = document.getElementById('imagePreview');
    
    if (imagePreview && images.length > 0) {
        imagePreview.innerHTML = '';
        images.forEach(image => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${image}" alt="Превью">
                <div class="preview-remove" onclick="removeImagePreview(this)">
                    <i class="fas fa-times"></i>
                </div>
            `;
            imagePreview.appendChild(previewItem);
        });
        
        // Обновляем скрытое поле
        updateImagesHiddenField();
    }
}

// Обработка отправки формы товара
function handleProductSubmit(e) {
    e.preventDefault();
    
    // Собираем данные формы
    const formData = new FormData(e.target);
    const productData = {
        id: parseInt(formData.get('productId')) || generateProductId(),
        name: formData.get('productName'),
        code: formData.get('productCode'),
        category: formData.get('productCategory'),
        section: formData.get('productSection') || '',
        price: parseInt(formData.get('productPrice')) || 0,
        oldPrice: formData.get('productOldPrice') ? parseInt(formData.get('productOldPrice')) : null,
        badge: formData.get('productBadge') || null,
        recommended: formData.get('productRecommended') === 'true',
        description: formData.get('productDescription'),
        specifications: formData.get('productSpecifications') || '',
        status: formData.get('productStatus') || 'active',
        stock: parseInt(formData.get('productStock')) || 0,
        images: JSON.parse(formData.get('productImages') || '[]'),
        createdAt: new Date().toISOString()
    };
    
    // Валидация
    if (!productData.name || !productData.description || productData.price <= 0) {
        showNotification('Пожалуйста, заполните все обязательные поля корректно', 'error');
        return;
    }
    
    // Проверяем, редактируем или добавляем товар
    const existingIndex = allProducts.findIndex(p => p.id === productData.id);
    
    if (existingIndex !== -1) {
        // Сохраняем старую дату создания при редактировании
        productData.createdAt = allProducts[existingIndex].createdAt;
        productData.updatedAt = new Date().toISOString();
        
        // Обновляем товар
        allProducts[existingIndex] = productData;
        showNotification('Товар успешно обновлен', 'success');
    } else {
        // Добавляем новый товар
        allProducts.push(productData);
        showNotification('Товар успешно добавлен', 'success');
    }
    
    // Сохраняем в localStorage
    saveProducts();
    
    // Закрываем модальное окно
    document.getElementById('productModal').classList.remove('active');
    
    // Перезагружаем таблицу
    loadProducts();
}

// Генерация ID товара
function generateProductId() {
    const products = allProducts;
    const maxId = products.reduce((max, product) => Math.max(max, product.id || 0), 0);
    return maxId + 1;
}

// Сохранение товаров в localStorage
function saveProducts() {
    try {
        localStorage.setItem('products', JSON.stringify(allProducts));
        
        // Обновляем счетчик
        updateProductsBadge();
        
        // Триггерим событие обновления для магазина
        window.dispatchEvent(new Event('productsDataUpdated'));
    } catch (error) {
        console.error('Ошибка сохранения товаров:', error);
        showNotification('Ошибка сохранения товаров', 'error');
    }
}

// Загрузка разделов
function loadSections() {
    try {
        const sectionsData = localStorage.getItem('admin_sections');
        const sections = sectionsData ? JSON.parse(sectionsData) : [];
        
        const sectionSelect = document.getElementById('productSection');
        if (sectionSelect) {
            // Очищаем существующие опции (кроме первой)
            while (sectionSelect.options.length > 1) {
                sectionSelect.remove(1);
            }
            
            // Добавляем разделы
            sections.forEach(section => {
                if (section.active) {
                    const option = document.createElement('option');
                    option.value = section.code;
                    option.textContent = section.name;
                    sectionSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки разделов:', error);
    }
}

// Переключение статуса товара
function toggleProductStatus(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    product.status = product.status === 'active' ? 'inactive' : 'active';
    product.updatedAt = new Date().toISOString();
    
    saveProducts();
    renderProducts();
    
    const statusText = product.status === 'active' ? 'активирован' : 'деактивирован';
    showNotification(`Товар "${product.name}" ${statusText}`, 'success');
}

// Просмотр товара
function viewProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Открываем страницу товара в новой вкладке
    const productUrl = `../piece.html?id=${productId}`;
    window.open(productUrl, '_blank');
}

// Редактирование товара
function editProduct(productId) {
    openProductModal(productId);
}

// Подтверждение удаления
function confirmDelete(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('deleteModal');
    const deleteConfirm = document.getElementById('deleteConfirm');
    const productIdField = document.getElementById('deleteProductId');
    
    if (!modal || !deleteConfirm || !productIdField) return;
    
    productIdField.value = productId;
    
    // Устанавливаем обработчик на кнопку подтверждения
    deleteConfirm.onclick = () => deleteProduct(productId);
    
    modal.classList.add('active');
}

// Удаление товара
function deleteProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Удаляем товар
    allProducts = allProducts.filter(p => p.id !== productId);
    
    // Сохраняем изменения
    saveProducts();
    
    // Закрываем модальное окно
    document.getElementById('deleteModal').classList.remove('active');
    
    // Показываем уведомление
    showNotification(`Товар "${product.name}" удален`, 'success');
    
    // Перезагружаем таблицу
    loadProducts();
}

// Обновление счетчика товаров
function updateProductsBadge() {
    const badge = document.getElementById('productsBadge');
    if (badge) {
        badge.textContent = allProducts.length;
    }
}

// Получение названия категории
function getCategoryName(categoryCode) {
    const categories = {
        'pantograph': 'Пантографы',
        'wardrobe': 'Гардеробные системы',
        'shoerack': 'Обувницы',
        'premium': 'Премиум коллекция',
        'other': 'Другое'
    };
    
    return categories[categoryCode] || categoryCode || 'Не указана';
}

// Форматирование цены
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

// Переключение сайдбара
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// Выход из системы
function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_logged_in');
        
        showNotification('Вы успешно вышли из системы', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            ${message}
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transform: translateX(120%);
        transition: transform 0.3s ease;
        z-index: 2000;
        max-width: 400px;
        animation: slideIn 0.3s ease forwards;
    `;
    
    document.body.appendChild(notification);
    
    // Добавляем анимацию входа
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Добавляем CSS для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(120%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);