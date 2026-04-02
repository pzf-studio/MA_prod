import sqlite3

# ===== НАСТРОЙКИ (измените под себя) =====
DB_FILE = "ma_furniture.db"   # имя вашего файла базы данных
OUTPUT_FILE = "export.txt"   # имя текстового файла, который получится
# =========================================

def export_db_to_text(db_path, output_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Получаем список таблиц
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    with open(output_path, 'w', encoding='utf-8') as out_file:
        for (table_name,) in tables:
            out_file.write(f"\n=== Таблица: {table_name} ===\n")
            cursor.execute(f"SELECT * FROM '{table_name}'")
            rows = cursor.fetchall()
            if not rows:
                out_file.write("(пусто)\n\n")
                continue

            # Заголовки столбцов
            col_names = [desc[0] for desc in cursor.description]
            out_file.write(" | ".join(col_names) + "\n")
            out_file.write("-"*40 + "\n")

            for row in rows:
                out_file.write(" | ".join(str(v) for v in row) + "\n")
            out_file.write("\n")

    conn.close()
    print(f"Готово! Результат в файле: {output_path}")

if __name__ == "__main__":
    export_db_to_text(DB_FILE, OUTPUT_FILE)