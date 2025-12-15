// Круговой выбор цвета для товаров
class ColorPicker {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.variants = [];
        this.selectedVariant = null;
        this.onColorChange = options.onColorChange || null;
        this.baseProductName = options.baseProductName || '';
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        // Основная структура
        this.container.innerHTML = `
            <div class="color-picker-container">
                <h4 class="color-picker-title">Выберите цвет:</h4>
                <div class="color-wheel" id="colorWheel"></div>
                <div class="color-info" id="colorInfo">
                    <div class="selected-color-name" id="selectedColorName"></div>
                    <div class="selected-color-code" id="selectedColorCode"></div>
                </div>
            </div>
        `;
        
        // Стили (можно вынести в CSS)
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .color-picker-container {
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                text-align: center;
            }
            
            .color-picker-title {
                margin-bottom: 15px;
                color: #333;
                font-size: 16px;
                font-weight: 600;
            }
            
            .color-wheel {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 12px;
                margin: 0 auto;
                max-width: 300px;
            }
            
            .color-option {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 3px solid transparent;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .color-option:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .color-option.selected {
                border-color: #333;
                transform: scale(1.15);
                box-shadow: 0 0 0 2px #fff, 0 0 0 4px #333;
            }
            
            .color-option .color-tooltip {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: none;
            }
            
            .color-option:hover .color-tooltip {
                opacity: 1;
            }
            
            .color-info {
                margin-top: 15px;
                padding: 10px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e0e0e0;
            }
            
            .selected-color-name {
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
            }
            
            .selected-color-code {
                font-size: 14px;
                color: #666;
                font-family: monospace;
            }
            
            .product-name-with-color {
                font-size: 1.2rem;
                margin: 10px 0;
                color: #333;
            }
        `;
        document.head.appendChild(style);
    }
    
    setVariants(variants) {
        this.variants = variants;
        this.renderColorWheel();
        
        // Выбираем первый вариант по умолчанию
        if (variants.length > 0) {
            this.selectVariant(variants[0].variant_id);
        }
    }
    
    renderColorWheel() {
        const wheel = document.getElementById('colorWheel');
        if (!wheel) return;
        
        wheel.innerHTML = '';
        
        // Располагаем цвета по кругу
        const total = this.variants.length;
        const radius = 100; // Радиус круга
        
        this.variants.forEach((variant, index) => {
            // Вычисляем позицию на круге
            const angle = (index / total) * 2 * Math.PI;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            const option = document.createElement('div');
            option.className = 'color-option';
            option.style.backgroundColor = variant.color_hex || '#2C2C2C';
            option.style.position = 'absolute';
            option.style.left = `calc(50% + ${x}px)`;
            option.style.top = `calc(50% + ${y}px)`;
            option.style.transform = 'translate(-50%, -50%)';
            option.dataset.variantId = variant.variant_id;
            
            option.innerHTML = `
                <div class="color-tooltip">${variant.color_name}</div>
            `;
            
            option.addEventListener('click', () => {
                this.selectVariant(variant.variant_id);
            });
            
            wheel.appendChild(option);
        });
        
        // Устанавливаем размер контейнера для круга
        wheel.style.position = 'relative';
        wheel.style.width = '220px';
        wheel.style.height = '220px';
        wheel.style.margin = '20px auto';
    }
    
    selectVariant(variantId) {
        const variant = this.variants.find(v => v.variant_id === variantId);
        if (!variant) return;
        
        this.selectedVariant = variant;
        
        // Обновляем UI
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.variantId === variantId);
        });
        
        // Обновляем информацию
        const nameEl = document.getElementById('selectedColorName');
        const codeEl = document.getElementById('selectedColorCode');
        
        if (nameEl) nameEl.textContent = variant.color_name;
        if (codeEl) codeEl.textContent = `Артикул: ${variant.variant_id}`;
        
        // Обновляем название товара с цветом
        this.updateProductName(variant);
        
        // Колбек при изменении цвета
        if (this.onColorChange) {
            this.onColorChange(variant);
        }
    }
    
    updateProductName(variant) {
        // Находим элемент с названием товара и обновляем его
        const productNameEl = document.querySelector('.product-title, .product-name');
        if (productNameEl && this.baseProductName) {
            const newName = variant.is_original 
                ? this.baseProductName 
                : `${this.baseProductName}${variant.suffix || ''}`;
            productNameEl.textContent = newName;
        }
    }
    
    getSelectedVariant() {
        return this.selectedVariant;
    }
}

// Глобальный экспорт
window.ColorPicker = ColorPicker;