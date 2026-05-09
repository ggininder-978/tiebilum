import os
import csv

def peek_csv_more(filepath):
    try:
        with open(filepath, 'r', encoding='big5') as f:
            reader = csv.reader(f)
            lines = []
            for i, row in enumerate(reader):
                lines.append(row)
                if i > 10: break
            return lines
    except Exception as e:
        return [[str(e)]]

knowledge_dir = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum\knowledge'
target_file = os.path.join(knowledge_dir, '鐵比倫-銷售數據.xlsx - 2025 營收銷量(原始檔案).csv')
# Wait, I don't know the exact name yet. I'll search for it.
files = [f for f in os.listdir(knowledge_dir) if '2025' in f and f.endswith('.csv')]
if files:
    res = peek_csv_more(os.path.join(knowledge_dir, files[0]))
    for r in res:
        print(r)
