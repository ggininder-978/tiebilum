import pandas as pd
import os

# Create outputs directory if not exists
os.makedirs('outputs', exist_ok=True)

# Load the cleaned data
df = pd.read_csv('knowledge/wiki/analysis/2025_sales_sku_master.csv')

# Drop helper columns for the final user report
cols_to_drop = ['source_file', 'source_row', 'raw_route', 'raw_moq', 'product_name_raw', 'revenue_source', 'profit_source', 'analysis_sku']
df_clean = df.drop(columns=[c for c in cols_to_drop if c in df.columns])

# Create Excel writer
output_path = 'outputs/Tiebilum_2025_Sales_Master.xlsx'
with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
    # 1. Main Data Sheet
    df_clean.to_sheet_name = '2025銷售總表'
    df_clean.to_excel(writer, sheet_name='2025銷售總表', index=False)
    
    # 2. Profit Analysis (Group by product)
    # Summing revenue and profit
    profit_summary = df.groupby('product_name_std').agg({
        'quantity_2025': 'sum',
        'revenue': 'sum',
        'contribution_profit': 'sum'
    }).reset_index()
    
    # Calculate Net Margin
    profit_summary['淨利率 (%)'] = (profit_summary['contribution_profit'] / profit_summary['revenue'] * 100).round(2)
    profit_summary = profit_summary.sort_values('contribution_profit', ascending=False)
    
    profit_summary.to_excel(writer, sheet_name='產品獲利診斷', index=False)
    
    # 3. Channel Performance
    channel_summary = df.groupby('channel_name').agg({
        'revenue': 'sum',
        'contribution_profit': 'sum'
    }).reset_index()
    channel_summary['獲利貢獻度 (%)'] = (channel_summary['contribution_profit'] / channel_summary['revenue'] * 100).round(2)
    channel_summary = channel_summary.sort_values('revenue', ascending=False)
    
    channel_summary.to_excel(writer, sheet_name='通路表現分析', index=False)

print(f"Excel file generated at: {output_path}")
