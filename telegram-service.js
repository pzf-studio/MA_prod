class TelegramService {
    constructor() {
        this.botToken = '8595614348:AAFSrVFLjI7o_FS-36DTDDLgGlGgSD03jLY';
        this.chatId = '743619189';
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    }

    async sendOrder(orderData) {
        try {
            const message = this.formatOrderMessage(orderData);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            const result = await response.json();
            
            if (result.ok) {
                console.log('Заказ успешно отправлен в Telegram');
                return {
                    success: true,
                    message_id: result.result.message_id,
                    telegram_sent: true
                };
            } else {
                throw new Error(result.description || 'Ошибка отправки в Telegram');
            }
        } catch (error) {
            console.error('Ошибка отправки в Telegram:', error);
            throw error;
        }
    }

    formatOrderMessage(orderData) {
        const formatPrice = (price) => {
            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0
            }).format(price);
        };

        let message = `<b>🛒 НОВЫЙ ЗАКАЗ MA FURNITURE</b>\n\n`;
        
        // Информация о товарах
        message += `<b>📦 Состав заказа:</b>\n`;
        orderData.items.forEach((item, index) => {
            message += `${index + 1}. <b>${this.escapeHtml(item.name)}</b>\n`;
            message += `   Количество: ${item.quantity} шт.\n`;
            message += `   Цена за шт: ${formatPrice(item.price)}\n`;
            message += `   Сумма: ${formatPrice(item.price * item.quantity)}\n\n`;
        });
        
        message += `<b>💰 ОБЩАЯ СУММА: ${formatPrice(orderData.total)}</b>\n\n`;
        
        // Информация о клиенте
        message += `<b>👤 Данные клиента:</b>\n`;
        message += `ФИО: ${this.escapeHtml(orderData.customer_name)}\n`;
        message += `Телефон: ${this.escapeHtml(orderData.customer_phone)}\n`;
        
        if (orderData.customer_email) {
            message += `Email: ${this.escapeHtml(orderData.customer_email)}\n`;
        }
        
        if (orderData.customer_address) {
            message += `Адрес: ${this.escapeHtml(orderData.customer_address)}\n`;
        }
        
        if (orderData.customer_comment) {
            message += `Комментарий: ${this.escapeHtml(orderData.customer_comment)}\n`;
        }
        
        message += `\n📅 ${new Date().toLocaleString('ru-RU')}`;
        message += `\n\n🌐 <i>Заказ с сайта: MA Furniture</i>`;
        
        return message;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

const telegramService = new TelegramService();