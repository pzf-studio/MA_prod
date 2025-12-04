# routes/auth.py
from flask import Blueprint, request, jsonify
import os
import hashlib

auth_bp = Blueprint('auth', __name__)

# Простые учетные данные для начала
ADMIN_CREDENTIALS = {
    'username': 'admin',
    'password': hashlib.sha256('admin123'.encode()).hexdigest()
}

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Необходимо указать логин и пароль'}), 400
        
        # Проверяем пароль (хешируем для сравнения)
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if username == ADMIN_CREDENTIALS['username'] and password_hash == ADMIN_CREDENTIALS['password']:
            # Создаем простой токен
            import base64, time
            token_data = f"{username}:{time.time()}"
            token = base64.b64encode(token_data.encode()).decode()
            
            return jsonify({
                'token': token,
                'user': {'username': username}
            })
        
        return jsonify({'error': 'Неверный логин или пароль'}), 401
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/verify', methods=['GET'])
def verify_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'valid': False}), 401
    
    token = auth_header.split(' ')[1]
    try:
        # Простая проверка токена
        decoded = base64.b64decode(token).decode()
        username, timestamp = decoded.split(':')
        
        # Проверяем, не устарел ли токен (24 часа)
        if float(timestamp) < time.time() - 86400:
            return jsonify({'valid': False}), 401
            
        return jsonify({'valid': True, 'user': {'username': username}})
    except:
        return jsonify({'valid': False}), 401