import os

def peek_raw_bytes(filepath):
    with open(filepath, 'rb') as f:
        return f.read(500)

knowledge_dir = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum\knowledge'
files = [f for f in os.listdir(knowledge_dir) if f.endswith('.csv') and 'K-' in f]

for f in files:
    print(f"File: {f}")
    data = peek_raw_bytes(os.path.join(knowledge_dir, f))
    # Try big5 decoding and replace errors
    try:
        print(data.decode('big5', errors='replace')[:200])
    except:
        print("Decode failed")
    print("-" * 20)
