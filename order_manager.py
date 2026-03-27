import os
import json
import requests
from datetime import datetime
import uuid
from database import get_db

class OrderManager:
    def __init__(self):
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID")

    def generate_order_id(self):
        timestamp = datetime.now().strftime("%Y%m%d")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"ORDER-{timestamp}-{unique_id}"

    def save_order(self, order_data):
        """Сохранение заказа в БД"""
        try:
            order_id = self.generate_order_id()
            order_data["order_id"] = order_id
            order_data["created_at"] = datetime.now().isoformat()
            order_data["status"] = "new"

            items_json = json.dumps(order_data.get('items', []))
            total = sum(i['price'] * i['quantity'] for i in order_data.get('items', []))

            with get_db() as conn:
                conn.execute('''
                    INSERT INTO orders
                    (order_id, customer_name, customer_phone, customer_email,
                     customer_address, customer_comment, items, total, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    order_id,
                    order_data.get('customer_name'),
                    order_data.get('customer_phone'),
                    order_data.get('customer_email', ''),
                    order_data.get('customer_address', ''),
                    order_data.get('customer_comment', ''),
                    items_json,
                    total,
                    'new',
                    order_data["created_at"]
                ))
            return order_id
        except Exception as e:
            print(f"Ошибка сохранения заказа: {e}")
            return None

    def format_telegram_message(self, order_data):
        items_text = "\n".join([
            f"• {item['name']} - {item['quantity']} шт. × {item['price']} ₽"
            for item in order_data.get('items', [])
        ])
        total = sum(item['price'] * item['quantity'] for item in order_data.get('items', []))
        message = f"""
🛒 *Новый заказ #{order_data['order_id']}*

👤 *Клиент:* {order_data.get('customer_name', 'Не указано')}
📞 *Телефон:* `{order_data.get('customer_phone', 'Не указано')}`
📧 *Email:* {order_data.get('customer_email', 'Не указано')}
📍 *Адрес:* {order_data.get('customer_address', 'Не указано')}

📋 *Состав заказа:*
{items_text}

💰 *Итого:* {total:,} ₽

📝 *Комментарий:*
{order_data.get('customer_comment', 'Без комментария')}

⏰ *Время заказа:* {order_data.get('created_at', '')}
"""
        return message

    def send_to_telegram(self, order_data):
        if not self.telegram_token or not self.telegram_chat_id:
            print("Ошибка: Не указаны Telegram токен или chat_id")
            return False
        try:
            message = self.format_telegram_message(order_data)
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            payload = {
                "chat_id": self.telegram_chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True
            }
            response = requests.post(url, json=payload, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Ошибка отправки в Telegram: {e}")
            return False

    def process_order(self, order_data):
        try:
            order_id = self.save_order(order_data)
            if not order_id:
                return {'success': False, 'error': 'Ошибка сохранения заказа'}
            telegram_sent = self.send_to_telegram(order_data)
            if telegram_sent:
                return {'success': True, 'order_id': order_id, 'message': 'Заказ успешно оформлен и отправлен в Telegram'}
            else:
                return {'success': True, 'order_id': order_id, 'message': 'Заказ сохранен, но не удалось отправить в Telegram', 'telegram_error': True}
        except Exception as e:
            print(f"Ошибка обработки заказа: {e}")
            return {'success': False, 'error': str(e)}

order_manager = OrderManager()