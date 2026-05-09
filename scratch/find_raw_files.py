import os
import csv

def get_header(filepath):
    # Try different encodings
    for enc in ['utf-8-sig', 'big5', 'utf-8', 'latin1']:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                reader = csv.reader(f)
                header = next(reader)
                # If header is mostly empty, try next line
                if len([c for c in header if c]) < 2:
                    header = next(reader)
                return enc, header
        except:
            continue
    return None, None

knowledge_dir = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum\knowledge'
files = [f for f in os.listdir(knowledge_dir) if f.endswith('.csv')]

for f in files:
    path = os.path.join(knowledge_dir, f)
    enc, header = get_header(path)
    print(f"File: {f}")
    print(f"Encoding: {enc}")
    print(f"Header: {header}")
    print("-" * 20)
