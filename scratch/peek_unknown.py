import os

def peek_raw_bytes(filepath):
    with open(filepath, 'rb') as f:
        return f.read(500)

knowledge_dir = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum\knowledge'
known_files = ['05_cleaned_sales_master.csv', '07_weighted_product_performance.csv', '08_spec_efficiency_analysis.csv', '09_sales_field_mapping_rules.csv']

for f in os.listdir(knowledge_dir):
    if f.endswith('.csv') and f not in known_files:
        print(f"File: {f}")
        data = peek_raw_bytes(os.path.join(knowledge_dir, f))
        try:
            # Try to find a readable encoding
            for enc in ['big5', 'utf-8', 'gbk']:
                try:
                    text = data.decode(enc)
                    print(f"Encoding {enc}: {text[:200]}")
                    break
                except:
                    continue
            else:
                print(f"Raw: {data[:100]}")
        except:
            print("Failed to decode")
        print("-" * 20)
