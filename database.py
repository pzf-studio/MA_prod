import sqlite3
import json
import os
from datetime import datetime
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'ma_furniture.db')

@contextmanager
def get_db():
    """Контекстный менеджер для подключения к БД."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Создаёт таблицы, если их нет."""
    with get_db() as conn:
        # Таблица товаров
        conn.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT,
                category TEXT,
                section TEXT,
                price INTEGER NOT NULL,
                old_price INTEGER,
                badge TEXT,
                recommended BOOLEAN DEFAULT 0,
                description TEXT,
                specifications TEXT,
                status TEXT DEFAULT 'active',
                stock INTEGER DEFAULT 0,
                images TEXT,          -- JSON-массив
                color_variants TEXT,  -- JSON-массив
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        # Таблица разделов
        conn.execute('''
            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                display_order INTEGER DEFAULT 0
            )
        ''')
        # Таблица фонов
        conn.execute('''
            CREATE TABLE IF NOT EXISTS backgrounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                image_url TEXT,
                active BOOLEAN DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        # Таблица заказов
        conn.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_email TEXT,
                customer_address TEXT,
                customer_comment TEXT,
                items TEXT NOT NULL,  -- JSON-массив
                total INTEGER,
                status TEXT DEFAULT 'new',
                created_at TEXT NOT NULL
            )
        ''')
        # Индексы для ускорения
        conn.execute('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_products_section ON products(section)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)')

def migrate_from_json():
    """Переносит данные из JSON-файлов в БД, если таблицы пусты."""
    from app import PRODUCTS_DIR, SECTIONS_FILE, BACKGROUND_FILE, DATA_DIR
    import os
    import json

    # Проверяем, есть ли уже товары в БД
    with get_db() as conn:
        cur = conn.execute('SELECT COUNT(*) FROM products')
        if cur.fetchone()[0] > 0:
            logger.info("База данных уже содержит товары, миграция не требуется")
            return

    logger.info("Начинаем миграцию данных из JSON в SQLite...")

    # Перенос товаров
    if os.path.exists(PRODUCTS_DIR):
        for filename in os.listdir(PRODUCTS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(PRODUCTS_DIR, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    product = json.load(f)
                # Преобразуем поля в формат БД
                images_json = json.dumps(product.get('images', []))
                color_variants_json = json.dumps(product.get('color_variants', []))
                with get_db() as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO products
                        (id, name, code, category, section, price, old_price, badge,
                         recommended, description, specifications, status, stock,
                         images, color_variants, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        product.get('id'),
                        product.get('name'),
                        product.get('code'),
                        product.get('category'),
                        product.get('section'),
                        product.get('price', 0),
                        product.get('old_price'),
                        product.get('badge'),
                        1 if product.get('recommended') else 0,
                        product.get('description'),
                        product.get('specifications'),
                        product.get('status', 'active'),
                        product.get('stock', 0),
                        images_json,
                        color_variants_json,
                        product.get('created_at', datetime.now().isoformat()),
                        product.get('updated_at', datetime.now().isoformat())
                    ))
        logger.info("Товары перенесены")

    # Перенос разделов
    if os.path.exists(SECTIONS_FILE):
        with open(SECTIONS_FILE, 'r', encoding='utf-8') as f:
            sections = json.load(f)
        for section in sections:
            with get_db() as conn:
                conn.execute('''
                    INSERT OR REPLACE INTO sections (id, code, name, active, display_order)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    section.get('id'),
                    section.get('code'),
                    section.get('name'),
                    1 if section.get('active', True) else 0,
                    section.get('display_order', 0)
                ))
        logger.info("Разделы перенесены")

    # Перенос фона
    if os.path.exists(BACKGROUND_FILE):
        with open(BACKGROUND_FILE, 'r', encoding='utf-8') as f:
            bg = json.load(f)
        with get_db() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO backgrounds (id, title, description, image_url, active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                bg.get('id', 1),
                bg.get('title'),
                bg.get('description'),
                bg.get('image_url'),
                1 if bg.get('active', True) else 0,
                bg.get('created_at', datetime.now().isoformat()),
                bg.get('updated_at', datetime.now().isoformat())
            ))
        logger.info("Фон перенесён")

    # Перенос заказов (если есть)
    orders_dir = os.path.join(DATA_DIR, 'orders')
    if os.path.exists(orders_dir):
        for filename in os.listdir(orders_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(orders_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    order = json.load(f)
                items_json = json.dumps(order.get('items', []))
                with get_db() as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO orders
                        (order_id, customer_name, customer_phone, customer_email,
                         customer_address, customer_comment, items, total, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        order.get('order_id'),
                        order.get('customer_name'),
                        order.get('customer_phone'),
                        order.get('customer_email'),
                        order.get('customer_address'),
                        order.get('customer_comment'),
                        items_json,
                        sum(i['price'] * i['quantity'] for i in order.get('items', [])),
                        order.get('status', 'new'),
                        order.get('created_at', datetime.now().isoformat())
                    ))
        logger.info("Заказы перенесены")

    logger.info("Миграция завершена")