import os
import csv

def peek_csv(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            return next(reader)
    except:
        try:
            with open(filepath, 'r', encoding='big5') as f:
                reader = csv.reader(f)
                return next(reader)
        except Exception as e:
            return [str(e)]

knowledge_dir = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum\knowledge'
files = [f for f in os.listdir(knowledge_dir) if f.endswith('.csv')]

for f in files:
    cols = peek_csv(os.path.join(knowledge_dir, f))
    print(f"File: {f}")
    print(f"Cols: {cols}")
    print("-" * 20)
