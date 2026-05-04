import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Set style
sns.set_theme(style="whitegrid")

# Load data
df = pd.read_csv('c:/Users/USER/.gemini/antigravity/scratch/tiebilum/scratch/tiebilum_sales_data.csv')

# Calculate Revenue and Profit
df['Revenue'] = df['Sales_Volume'] * df['Selling_Price']
df['Total_Cost'] = df['Sales_Volume'] * df['Cost']
df['Total_Profit'] = df['Revenue'] - df['Total_Cost']

# Mapping Chinese to English for chart labels
mapping = {
    '黑糖薑母茶': 'Ginger Tea (Pack)',
    '薑汁黑糖': 'Ginger Sugar (Bag)',
    '原味黑糖': 'Original Sugar (Bag)',
    '枸杞紅棗薑': 'Jujube Ginger (Bag)',
    '黑糖蜜': 'Black Sugar Syrup',
    '玫瑰四物': 'Rose Si-Wu',
    '冬瓜黑糖': 'Winter Melon'
}
df['Product_EN'] = df['Product'].map(mapping)

# Ensure assets directory exists
os.makedirs('c:/Users/USER/.gemini/antigravity/scratch/tiebilum/assets', exist_ok=True)

# Plot 1: Sales Volume by Product
plt.figure(figsize=(10, 6))
sns.barplot(data=df.sort_values('Sales_Volume', ascending=False), x='Sales_Volume', y='Product_EN', palette='viridis')
plt.title('Tiebilum Sales Volume by Product (2025)', fontsize=15)
plt.xlabel('Units Sold', fontsize=12)
plt.ylabel('Product', fontsize=12)
plt.tight_layout()
plt.savefig('c:/Users/USER/.gemini/antigravity/scratch/tiebilum/assets/sales_volume_chart.png')
plt.close()

# Plot 2: Revenue vs Profit
plt.figure(figsize=(10, 6))
df_melted = df.melt(id_vars='Product_EN', value_vars=['Revenue', 'Total_Profit'], var_name='Metric', value_name='Amount')
sns.barplot(data=df_melted, x='Amount', y='Product_EN', hue='Metric', palette='magma')
plt.title('Tiebilum Revenue vs Profit (2025)', fontsize=15)
plt.xlabel('Amount (NTD)', fontsize=12)
plt.ylabel('Product', fontsize=12)
plt.tight_layout()
plt.savefig('c:/Users/USER/.gemini/antigravity/scratch/tiebilum/assets/revenue_profit_chart.png')
plt.close()

# Plot 3: Profit Margin Pie Chart
plt.figure(figsize=(8, 8))
plt.pie(df['Total_Profit'], labels=df['Product_EN'], autopct='%1.1f%%', startangle=140, colors=sns.color_palette('pastel'))
plt.title('Tiebilum Profit Contribution by Product', fontsize=15)
plt.axis('equal')
plt.tight_layout()
plt.savefig('c:/Users/USER/.gemini/antigravity/scratch/tiebilum/assets/profit_contribution_pie.png')
plt.close()

print("Charts generated successfully in assets/ directory.")
