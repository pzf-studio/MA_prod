import sqlite3
import json
import os
from datetime import date, datetime

# ===== НАСТРОЙКИ =====
DB_FILE = "ma_furniture.db"   # путь к вашей базе данных
# =====================

def convert_to_serializable(obj):
    """Преобразует datetime/date в строку ISO"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def convert_value(key, value):
    """Преобразует значения для корректного JSON: bool, массивы images"""
    # Булевы поля (если в БД 0/1)
    if key == "recommended" and isinstance(value, int):
        return bool(value)
    # Поле images: пробуем распарсить как JSON-массив, иначе как список через запятую
    if key == "images" and isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except:
            # Если не JSON, может быть строка вида "/img/1.png,/img/2.png"
            if ',' in value:
                return [img.strip() for img in value.split(',')]
            else:
                return [value] if value else []
    return value

def ensure_dirs():
    os.makedirs("data/products", exist_ok=True)

def export_sections(conn):
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
    print(f"Секции: {len(sections)} → data/sections.json")

def export_products(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    col_names = [description[0] for description in cursor.description]
    file_number = 1
    for row in rows:
        product_dict = {}
        for idx, col in enumerate(col_names):
            val = row[idx]
            # Преобразуем значение в зависимости от колонки
            product_dict[col] = convert_value(col, val)
        file_path = f"data/products/{file_number}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(product_dict, f, ensure_ascii=False, indent=4, default=convert_to_serializable)
        file_number += 1
    print(f"Товары: {file_number-1} → data/products/1.json ... {file_number-1}.json")

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