# database/db.py
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def init_app(app):
    # Создаем директорию /data если её нет
    data_dir = '/data'
    if not os.path.exists(data_dir):
        os.makedirs(data_dir, exist_ok=True)
    
    # Создаем директорию для загрузок
    uploads_dir = '/data/uploads'
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir, exist_ok=True)
    
    db.init_app(app)
    
    # Создаем симлинк для статических файлов
    static_uploads_dir = os.path.join(app.static_folder, 'uploads')
    if not os.path.exists(static_uploads_dir):
        try:
            os.symlink(uploads_dir, static_uploads_dir)
        except:
            # Если симлинк не работает, просто создаем директорию
            os.makedirs(static_uploads_dir, exist_ok=True)