#!/usr/bin/env python3
"""
Создание тестовых данных для MA Furniture
Запуск: python create_test_data.py
"""

import json
import os
from datetime import datetime

# Создаем структуру папок
data_dir = 'data'
products_dir = os.path.join(data_dir, 'products')

os.makedirs(products_dir, exist_ok=True)

print("=" * 60)
print("Создание тестовых данных для MA Furniture")
print("=" * 60)

# Тестовый товар 1
product1 = {
    "id": 1,
    "name": "Электрический пантограф Premium",
    "code": "PANTO-001",
    "category": "pantograph",
    "section": "pantographs",
    "price": 45000,
    "old_price": 52000,
    "badge": "Новинка",
    "recommended": True,
    "description": "Премиум электрический пантограф с плавным ходом, бесшумным электроприводом и возможностью управления с пульта. Идеальное решение для гардеробных комнат.",
    "specifications": "Материал: алюминий\nЦвет: черный матовый\nДлина: 120см\nГрузоподъемность: 25кг\nГарантия: 3 года",
    "status": "active",
    "stock": 5,
    "images": ["/static/images/1.png"],
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
}

# Тестовый товар 2
product2 = {
    "id": 2,
    "name": "Гардеробная система Luxe",
    "code": "WARDROBE-001",
    "category": "wardrobe",
    "section": "wardrobes",
    "price": 89000,
    "old_price": 105000,
    "badge": "Хит продаж",
    "recommended": True,
    "description": "Полноценная гардеробная система премиум-класса с системой пантографов, выдвижными ящиками и подсветкой. Итальянский дизайн, немецкое качество.",
    "specifications": "Материал: ЛДСП 18мм\nРазмеры: 200x180x60см\nЦвет: белый матовый/дуб сонома\nФурнитура: Blum\nГарантия: 5 лет",
    "status": "active",
    "stock": 3,
    "images": ["/static/images/2.jpeg"],
    "created_at": "2024-01-10T14:20:00",
    "updated_at": "2024-01-10T14:20:00"
}

# Тестовый товар 3
product3 = {
    "id": 3,
    "name": "Обувница Modern",
    "code": "SHOE-001",
    "category": "shoerack",
    "section": "shoeracks",
    "price": 18500,
    "badge": "Акция",
    "recommended": False,
    "description": "Современная обувница на 12 пар с регулируемыми полками. Экономит пространство, удобна в использовании.",
    "specifications": "Материал: металл/МДФ\nКоличество полок: 4\nВместимость: 12 пар\nЦвет: серый/черный\nРазмеры: 80x35x100см",
    "status": "active",
    "stock": 12,
    "images": ["/static/images/3.jpg"],
    "created_at": "2024-01-05T09:15:00",
    "updated_at": "2024-01-05T09:15:00"
}

# Сохраняем товары
print(f"📁 Создание товаров в: {products_dir}/")

with open(os.path.join(products_dir, '1.json'), 'w', encoding='utf-8') as f:
    json.dump(product1, f, ensure_ascii=False, indent=2)
    print(f"✅ Товар 1: {product1['name']}")

with open(os.path.join(products_dir, '2.json'), 'w', encoding='utf-8') as f:
    json.dump(product2, f, ensure_ascii=False, indent=2)
    print(f"✅ Товар 2: {product2['name']}")

with open(os.path.join(products_dir, '3.json'), 'w', encoding='utf-8') as f:
    json.dump(product3, f, ensure_ascii=False, indent=2)
    print(f"✅ Товар 3: {product3['name']}")

# Разделы
sections = [
    {"id": 1, "code": "pantographs", "name": "Пантографы", "active": True, "display_order": 1},
    {"id": 2, "code": "wardrobes", "name": "Гардеробные системы", "active": True, "display_order": 2},
    {"id": 3, "code": "shoeracks", "name": "Обувницы", "active": True, "display_order": 3},
    {"id": 4, "code": "premium", "name": "Премиум коллекция", "active": True, "display_order": 4}
]

sections_file = os.path.join(data_dir, 'sections.json')
with open(sections_file, 'w', encoding='utf-8') as f:
    json.dump(sections, f, ensure_ascii=False, indent=2)
    print(f"✅ Разделы: {sections_file}")

print("\n" + "=" * 60)
print("✅ Тестовые данные успешно созданы!")
print("=" * 60)
print(f"\n📊 Статистика:")
print(f"   Товаров: 3 шт.")
print(f"   Разделов: 4 шт.")
print(f"\n🚀 Для проверки запустите:")
print(f"   python app.py")
print(f"   Затем откройте: http://localhost:5000/api/products")
print("=" * 60)