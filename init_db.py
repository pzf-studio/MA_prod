# init_db.py
from app import create_app
from database.db import db
from models.section import Section
from models.product import Product
import json

app = create_app()

with app.app_context():
    print("🔧 Инициализация базы данных...")
    
    try:
        # Создаем все таблицы
        db.create_all()
        print("✅ Таблицы созданы")
        
        # Проверяем, есть ли уже разделы
        sections_count = Section.query.count()
        if sections_count == 0:
            print("📁 Создаем базовые разделы...")
            
            basic_sections = [
                {'name': 'Кровати', 'code': 'beds', 'active': True},
                {'name': 'Диваны', 'code': 'sofas', 'active': True},
                {'name': 'Столы', 'code': 'tables', 'active': True},
                {'name': 'Стулья', 'code': 'chairs', 'active': True},
                {'name': 'Шкафы', 'code': 'wardrobes', 'active': True}
            ]
            
            for section_data in basic_sections:
                section = Section(**section_data)
                db.session.add(section)
            
            db.session.commit()
            print(f"✅ Создано {len(basic_sections)} разделов")
        
        # Проверяем, есть ли уже товары
        products_count = Product.query.count()
        print(f"📊 Статистика базы данных:")
        print(f"   Разделов: {Section.query.count()}")
        print(f"   Товаров: {Product.query.count()}")
        
        print("🎉 Инициализация завершена!")
        
    except Exception as e:
        print(f"❌ Ошибка инициализации: {e}")
        import traceback
        traceback.print_exc()