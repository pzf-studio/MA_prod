# init_db.py
from app import create_app
from database.db import db
from models.section import Section
from models.product import Product
from models.order import Order
import os

def init_database():
    app = create_app()
    
    with app.app_context():
        # Создаем все таблицы
        db.create_all()
        
        # Проверяем, есть ли уже разделы
        if Section.query.count() == 0:
            print("Создание базовых разделов...")
            
            sections = [
                Section(name='Кровати', code='beds', active=True, display_order=1),
                Section(name='Диваны', code='sofas', active=True, display_order=2),
                Section(name='Столы', code='tables', active=True, display_order=3),
                Section(name='Стулья', code='chairs', active=True, display_order=4),
                Section(name='Шкафы', code='wardrobes', active=True, display_order=5)
            ]
            
            for section in sections:
                db.session.add(section)
            
            db.session.commit()
            print(f"Создано {len(sections)} разделов")
        
        # Проверяем, есть ли уже товары
        if Product.query.count() == 0:
            print("Создание демо товаров...")
            
            beds_section = Section.query.filter_by(code='beds').first()
            sofas_section = Section.query.filter_by(code='sofas').first()
            
            if beds_section:
                products = [
                    Product(
                        name='Двуспальная кровать "Люкс"',
                        description='Элегантная двуспальная кровать из массива дуба',
                        price=45000,
                        section_id=beds_section.id,
                        images='["/static/images/example.png"]',
                        badge='Хит продаж',
                        active=True,
                        display_order=1
                    ),
                    Product(
                        name='Односпальная кровать "Милан"',
                        description='Компактная односпальная кровать с ящиками для белья',
                        price=32000,
                        section_id=beds_section.id,
                        images='["/static/images/example.png"]',
                        badge='Новинка',
                        active=True,
                        display_order=2
                    )
                ]
                
                for product in products:
                    db.session.add(product)
            
            if sofas_section:
                products = [
                    Product(
                        name='Угловой диван "Неаполь"',
                        description='Вместительный угловой диван с механизмом трансформации',
                        price=68000,
                        section_id=sofas_section.id,
                        images='["/static/images/example.png"]',
                        badge='Акция',
                        active=True,
                        display_order=1
                    )
                ]
                
                for product in products:
                    db.session.add(product)
            
            db.session.commit()
            print(f"Создано {Product.query.count()} демо товаров")
        
        print(f"✅ База данных инициализирована")
        print(f"📁 Разделы: {Section.query.count()}")
        print(f"📦 Товары: {Product.query.count()}")
        print(f"📋 Заказы: {Order.query.count()}")

if __name__ == '__main__':
    init_database()