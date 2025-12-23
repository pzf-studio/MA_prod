// Круговой пикер цветов для админки
class AdminColorPicker {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.palette = options.palette || this.getDefaultPalette();
        this.selectedColor = null;
        this.onColorSelect = options.onColorSelect || null;
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="admin-color-picker">
                <h4>Выберите цвет для копии</h4>
                <div class="color-palette-circle" id="colorPaletteCircle"></div>
                <div class="selected-color-info">
                    <div class="color-preview" id="selectedColorPreview"></div>
                    <div class="color-details">
                        <input type="text" id="colorNameInput" placeholder="Название цвета" class="color-name-input">
                        <input type="color" id="colorHexInput" value="#2C2C2C" class="color-hex-input">
                        <small>или укажите цвет вручную</small>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
        this.renderColorCircle();
        this.bindEvents();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .admin-color-picker {
                padding: 20px;
                background: white;
                border-radius: 10px;
                margin: 20px 0;
            }
            
            .color-palette-circle {
                position: relative;
                width: 300px;
                height: 300px;
                margin: 0 auto 30px;
                border-radius: 50%;
                background: radial-gradient(circle, #f5f5f5 0%, #e0e0e0 100%);
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .color-circle-option {
                position: absolute;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border: 3px solid white;
                cursor: pointer;
                transform: translate(-50%, -50%);
                transition: all 0.3s ease;
                box-shadow: 0 3px 8px rgba(0,0,0,0.2);
            }
            
            .color-circle-option:hover {
                transform: translate(-50%, -50%) scale(1.15);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                z-index: 10;
            }
            
            .color-circle-option.selected {
                border: 3px solid #333;
                transform: translate(-50%, -50%) scale(1.2);
                box-shadow: 0 0 0 3px white, 0 0 0 5px #333;
                z-index: 20;
            }
            
            .selected-color-info {
                display: flex;
                gap: 20px;
                align-items: center;
                justify-content: center;
                margin-top: 25px;
            }
            
            .color-preview {
                width: 60px;
                height: 60px;
                border-radius: 8px;
                border: 2px solid #ddd;
            }
            
            .color-name-input {
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                width: 200px;
            }
            
            .color-hex-input {
                width: 60px;
                height: 40px;
                border: none;
                cursor: pointer;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);
    }
    
    getDefaultPalette() {
        return [
            { name: 'Черный матовый', hex: '#2C2C2C' },
            { name: 'Белый глянцевый', hex: '#FFFFFF' },
            { name: 'Серый металлик', hex: '#7D7D7D' },
            { name: 'Коричневый', hex: '#8B4513' },
            { name: 'Бежевый', hex: '#F5DEB3' },
            { name: 'Серый бетон', hex: '#9E9E9E' },
            { name: 'Черный глянец', hex: '#1A1A1A' },
            { name: 'Белый матовый', hex: '#F8F8F8' }
        ];
    }
    
    renderColorCircle() {
        const circle = document.getElementById('colorPaletteCircle');
        if (!circle) return;
        
        const total = this.palette.length;
        const radius = 120; // Радиус круга
        
        this.palette.forEach((color, index) => {
            const angle = (index / total) * 2 * Math.PI;
            const x = radius * Math.cos(angle) + 150;
            const y = radius * Math.sin(angle) + 150;
            
            const option = document.createElement('div');
            option.className = 'color-circle-option';
            option.style.left = `${x}px`;
            option.style.top = `${y}px`;
            option.style.backgroundColor = color.hex;
            option.title = color.name;
            option.dataset.color = JSON.stringify(color);
            
            option.addEventListener('click', () => {
                this.selectColor(color);
            });
            
            circle.appendChild(option);
        });
    }
    
    selectColor(color) {
        this.selectedColor = color;
        
        // Обновляем UI
        document.querySelectorAll('.color-circle-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-color*="${color.hex}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Обновляем превью и поля
        const preview = document.getElementById('selectedColorPreview');
        const nameInput = document.getElementById('colorNameInput');
        const hexInput = document.getElementById('colorHexInput');
        
        if (preview) preview.style.backgroundColor = color.hex;
        if (nameInput) nameInput.value = color.name;
        if (hexInput) hexInput.value = color.hex;
        
        // Колбек
        if (this.onColorSelect) {
            this.onColorSelect(color);
        }
    }
    
    bindEvents() {
        const nameInput = document.getElementById('colorNameInput');
        const hexInput = document.getElementById('colorHexInput');
        
        if (nameInput && hexInput) {
            hexInput.addEventListener('input', (e) => {
                const preview = document.getElementById('selectedColorPreview');
                if (preview) preview.style.backgroundColor = e.target.value;
                
                this.selectedColor = {
                    name: nameInput.value || 'Пользовательский',
                    hex: e.target.value
                };
            });
            
            nameInput.addEventListener('input', () => {
                if (this.selectedColor) {
                    this.selectedColor.name = nameInput.value;
                }
            });
        }
    }
    
    setPalette(palette) {
        this.palette = palette;
        const circle = document.getElementById('colorPaletteCircle');
        if (circle) {
            circle.innerHTML = '';
            this.renderColorCircle();
        }
    }
    
    getSelectedColor() {
        if (!this.selectedColor) {
            // Возвращаем цвет по умолчанию
            return {
                name: document.getElementById('colorNameInput')?.value || 'Черный матовый',
                hex: document.getElementById('colorHexInput')?.value || '#2C2C2C'
            };
        }
        return this.selectedColor;
    }
}

window.AdminColorPicker = AdminColorPicker;