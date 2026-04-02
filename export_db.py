import sqlite3
import json
import os
from datetime import date, datetime

# ===== НАСТРОЙКИ =====
DB_FILE = "ma_furniture.db"   # путь к вашей базе данных
# =====================

def convert_to_serializable(obj):
    """Преобразует datetime/date в строку ISO для JSON"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def ensure_dirs():
    """Создаёт папки data и data/products, если их нет"""
    os.makedirs("data/products", exist_ok=True)

def export_sections(conn):
    """Сохраняет таблицу sections в data/sections.json"""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sections")
    rows = cursor.fetchall()
    col_names = [description[0] for description in cursor.description]
    sections = []
    for row in rows:
        section_dict = dict(zip(col_names, row))
        sections.append(section_dict)
    
    with open("data/sections.json", "w", encoding="utf-8") as f:
        json.dump(sections, f, ensure_ascii=False, indent=4, default=convert_to_serializable)
    print(f"Сохранено секций: {len(sections)} → data/sections.json")

def export_products(conn):
    """Сохраняет каждый товар в отдельный JSON-файл с добавлением поля 'availability': 0"""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    col_names = [description[0] for description in cursor.description]
    
    file_number = 1
    for row in rows:
        product_dict = dict(zip(col_names, row))
        # Добавляем поле availability в конец
        product_dict["availability"] = 0
        file_path = f"data/products/{file_number}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(product_dict, f, ensure_ascii=False, indent=4, default=convert_to_serializable)
        file_number += 1
    print(f"Сохранено товаров: {file_number - 1} → data/products/1.json ... {file_number-1}.json")

def main():
    ensure_dirs()
    conn = sqlite3.connect(DB_FILE)
    try:
        export_sections(conn)
        export_products(conn)
    finally:
        conn.close()

if __name__ == "__main__":
    main()