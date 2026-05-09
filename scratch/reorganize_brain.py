import os
import shutil

repo_root = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum'
knowledge_dir = os.path.join(repo_root, 'knowledge')
sources_dir = os.path.join(knowledge_dir, 'sources')
specs_dir = os.path.join(knowledge_dir, 'specs')
wiki_dir = os.path.join(knowledge_dir, 'wiki')
analysis_dir = os.path.join(wiki_dir, 'analysis')

# Move raw sources
for f in os.listdir(knowledge_dir):
    if '原始檔案' in f or '產品基本資訊' in f:
        shutil.move(os.path.join(knowledge_dir, f), os.path.join(sources_dir, f))

# Move specs
shutil.move(os.path.join(knowledge_dir, '09_sales_data_cleaning_rules.md'), os.path.join(specs_dir, 'sales_cleaning_spec.md'))
shutil.move(os.path.join(knowledge_dir, '09_sales_field_mapping_rules.csv'), os.path.join(specs_dir, 'sales_mapping_rules.csv'))

# Move analysis
analysis_files = [
    ('cleaned_sales_sku_master.csv', '2025_sales_sku_master.csv'),
    ('cleaning_audit.csv', '2025_sales_cleaning_audit.csv'),
    ('07_weighted_product_performance.csv', 'weighted_product_performance.csv'),
    ('08_spec_efficiency_analysis.csv', 'spec_efficiency_analysis.csv'),
    ('05_cleaned_sales_master.csv', 'legacy_sales_master.csv')
]

for src, dst in analysis_files:
    src_path = os.path.join(knowledge_dir, src)
    if os.path.exists(src_path):
        shutil.move(src_path, os.path.join(analysis_dir, dst))

print("Files reorganized successfully.")
