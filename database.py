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
    with get_db() as conn:
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
                images TEXT,
                color_variants TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        ensure_columns(conn)

        conn.execute('''
            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                display_order INTEGER DEFAULT 0,
                image_url TEXT DEFAULT ''
            )
        ''')

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
        conn.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_email TEXT,
                customer_address TEXT,
                customer_comment TEXT,
                items TEXT NOT NULL,
                total INTEGER,
                status TEXT DEFAULT 'new',
                created_at TEXT NOT NULL
            )
        ''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_products_section ON products(section)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)')

def ensure_columns(conn):
    cursor = conn.execute("PRAGMA table_info(products)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'is_price_on_request' not in columns:
        conn.execute('ALTER TABLE products ADD COLUMN is_price_on_request BOOLEAN DEFAULT 0')
        logger.info("Добавлено поле is_price_on_request")

    if 'availability' not in columns:
        conn.execute('ALTER TABLE products ADD COLUMN availability INTEGER DEFAULT 0')
        logger.info("Добавлено поле availability")

    # После миграции добавим поле image_url в sections, если его ещё нет
    # Для ALTER TABLE SQLite не проверяем через PRAGMA, а просто выполняем с try/except
    try:
        conn.execute("ALTER TABLE sections ADD COLUMN image_url TEXT DEFAULT ''")
        logger.info("Добавлено поле image_url в таблицу sections")
    except sqlite3.OperationalError:
        pass  # поле уже существует

def migrate_from_json(products_dir, sections_file, background_file, data_dir):
    import os
    import json
    from datetime import datetime

    with get_db() as conn:
        ensure_columns(conn)
        cur = conn.execute('SELECT COUNT(*) FROM products')
        if cur.fetchone()[0] > 0:
            logger.info("База уже содержит товары, миграция не требуется")
            return

    logger.info("Начинаем миграцию из JSON...")

    if os.path.exists(products_dir):
        for filename in os.listdir(products_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(products_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    product = json.load(f)
                images_json = json.dumps(product.get('images', []))
                color_variants_json = json.dumps(product.get('color_variants', []))
                with get_db() as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO products
                        (id, name, code, category, section, price, old_price, badge,
                         recommended, description, specifications, status, stock,
                         images, color_variants, created_at, updated_at, is_price_on_request, availability)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        product.get('updated_at', datetime.now().isoformat()),
                        0,  # is_price_on_request
                        0   # availability
                    ))
        logger.info("Товары перенесены")

    if os.path.exists(sections_file):
        with open(sections_file, 'r', encoding='utf-8') as f:
            sections = json.load(f)
        for section in sections:
            with get_db() as conn:
                conn.execute('''
                    INSERT OR REPLACE INTO sections (id, code, name, active, display_order, image_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    section.get('id'),
                    section.get('code'),
                    section.get('name'),
                    1 if section.get('active', True) else 0,
                    section.get('display_order', 0),
                    section.get('image_url', '')
                ))
        logger.info("Разделы перенесены")

    if os.path.exists(background_file):
        with open(background_file, 'r', encoding='utf-8') as f:
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

    logger.info("Миграция завершена")