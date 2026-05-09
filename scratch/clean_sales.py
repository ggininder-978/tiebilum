import os
import csv
import re

def clean_number(val):
    if not val: return None
    # Remove comma, whitespace, currency symbols
    val = re.sub(r'[^\d\.\-]', '', str(val))
    try:
        return float(val)
    except:
        return None

def parse_route(route_str):
    res = {
        'channel_type': '未分類',
        'channel_name': None,
        'package_type': None,
        'unit_quantity': None,
        'unit': None,
        'sales_unit': None
    }
    if not route_str: return res
    
    # Example: 批發-台糖*單顆包裝夾鏈袋260g
    # 批發-農會*手切夾鏈袋380g
    # 貼牌客戶-埔里農會*手切夾鏈袋380g
    
    # Try to split by '-' or '*' or whitespace
    parts = re.split(r'[-\*]', route_str)
    
    if '批發' in route_str:
        res['channel_type'] = '批發'
    elif '貼牌' in route_str:
        res['channel_type'] = '貼牌'
    elif '科技中藥廠' in route_str:
        res['channel_type'] = 'OEM'
        res['channel_name'] = '科技中藥廠'
        res['package_type'] = '薑母茶'
    elif '日月町' in route_str:
        res['channel_type'] = '通路上架'
        res['channel_name'] = '日月町'
        res['package_type'] = '禮盒'

    if '台糖' in route_str: res['channel_name'] = '台糖'
    if '農會' in route_str: res['channel_name'] = '農會'
    if '埔里農會' in route_str: res['channel_name'] = '埔里農會'

    # Package type and specs
    if '單顆包' in route_str: res['package_type'] = '單顆包'
    if '手切' in route_str: res['package_type'] = '手切'
    if '夾鏈袋' in route_str: 
        if res['package_type']: res['package_type'] += '夾鏈袋'
        else: res['package_type'] = '夾鏈袋'
    
    if '蜜類' in route_str:
        res['package_type'] = '蜜類瓶裝'
        res['sales_unit'] = '瓶'

    # Extract quantity and unit
    match = re.search(r'(\d+)\s*(g|ml|台斤)', route_str)
    if match:
        res['unit_quantity'] = float(match.group(1))
        res['unit'] = match.group(2)
    
    if '每台斤' in route_str:
        res['unit_quantity'] = 600
        res['unit'] = 'g'
        res['sales_unit'] = '台斤'

    return res

def run_cleaning():
    knowledge_dir = r'c:\Users\user\.gemini\antigravity\scratch\tiebilum\knowledge'
    
    # Identify files
    sales_file = None
    for f in os.listdir(knowledge_dir):
        if '2025' in f and '禬' in f: # '營收' in big5 or similar garbled
            sales_file = os.path.join(knowledge_dir, f)
            break
    
    if not sales_file:
        # Fallback to the one we saw with the right header
        sales_file = os.path.join(knowledge_dir, '鐵比倫-銷售數據.xlsx - 2025 營收銷量(原始檔案).csv')
        # Wait, I need the EXACT filename from the OS.
        files = os.listdir(knowledge_dir)
        for f in files:
            if '2025' in f and f.endswith('.csv'):
                sales_file = os.path.join(knowledge_dir, f)
                break

    print(f"Loading {sales_file}...")
    
    cleaned_rows = []
    
    with open(sales_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        # Skip header rows until we find the real header
        rows = list(reader)
        start_row = 0
        for i, row in enumerate(rows):
            if '客戶/通路' in row:
                start_row = i
                break
        
        header = rows[start_row]
        data = rows[start_row+1:]
        
        for i, row in enumerate(data):
            if not any(row): continue
            
            # Map raw fields
            d = dict(zip(header, row))
            
            raw_route = d.get('客戶/通路', '')
            raw_moq = d.get('合作方式/MOQ', '')
            product_name_raw = d.get('品名', '')
            
            # Parsing route
            route_info = parse_route(raw_route)
            
            # Values
            qty = clean_number(d.get('2025訂購數量'))
            price = clean_number(d.get('批價'))
            cost = clean_number(d.get('產品成本'))
            gp = clean_number(d.get('商品毛利'))
            gm = clean_number(d.get('商品毛利率'))
            op_exp = clean_number(d.get('營業費用'))
            tax = clean_number(d.get('發票5%'))
            exp_sub = clean_number(d.get('費用小計'))
            rep_net = clean_number(d.get('淨利'))
            rep_cont = clean_number(d.get('商品貢獻淨利'))
            rep_rev = clean_number(d.get('營業額'))
            
            # Calculated values
            calc_net = None
            if gp is not None and op_exp is not None and tax is not None:
                calc_net = gp - op_exp - tax
            
            net_profit = calc_net if calc_net is not None else rep_net
            
            calc_rev = None
            if qty is not None and price is not None:
                calc_rev = qty * price
            
            rev = rep_rev if rep_rev is not None else calc_rev
            rev_source = 'reported' if rep_rev is not None else ('calculated' if calc_rev is not None else 'missing')
            
            calc_cont = None
            if qty is not None and net_profit is not None:
                calc_cont = qty * net_profit
            
            cont = rep_cont if rep_cont is not None else calc_cont
            profit_source = 'reported' if rep_cont is not None else ('calculated' if calc_cont is not None else 'missing')
            
            # SKU Key
            sku_key = f"{product_name_raw}_{route_info['channel_name']}_{route_info['package_type']}_{price}"
            
            flags = []
            if rev_source == 'calculated': flags.append('calculated_revenue')
            if profit_source == 'calculated': flags.append('calculated_profit')
            if price is None: flags.append('missing_price')
            if cost is None: flags.append('missing_cost')
            if route_info['unit_quantity'] is None: flags.append('missing_spec')
            if net_profit is not None and net_profit < 0: flags.append('negative_profit')

            cleaned_row = {
                'source_file': os.path.basename(sales_file),
                'source_row': start_row + i + 2,
                'raw_route': raw_route,
                'raw_moq': raw_moq,
                'channel_type': route_info['channel_type'],
                'channel_name': route_info['channel_name'],
                'product_name_raw': product_name_raw,
                'product_name_std': product_name_raw.strip(), # Simple for now
                'package_type': route_info['package_type'],
                'unit_quantity': route_info['unit_quantity'],
                'unit': route_info['unit'],
                'sales_unit': route_info['sales_unit'],
                'quantity_2025': qty,
                'wholesale_price': price,
                'product_cogs': cost,
                'gross_profit_per_unit': gp,
                'gross_margin': gm,
                'operating_expense_per_unit': op_exp,
                'invoice_tax_per_unit': tax,
                'expense_subtotal_per_unit': exp_sub,
                'reported_net_profit_per_unit': rep_net,
                'calculated_net_profit_per_unit': calc_net,
                'net_profit_per_unit': net_profit,
                'reported_contribution_profit': rep_cont,
                'calculated_contribution_profit': calc_cont,
                'contribution_profit': cont,
                'reported_revenue': rep_rev,
                'calculated_revenue': calc_rev,
                'revenue': rev,
                'revenue_source': rev_source,
                'profit_source': profit_source,
                'analysis_sku': sku_key,
                'quality_flags': ';'.join(flags)
            }
            cleaned_rows.append(cleaned_row)

    output_file = os.path.join(knowledge_dir, 'cleaned_sales_sku_master.csv')
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=cleaned_rows[0].keys())
        writer.writeheader()
        writer.writerows(cleaned_rows)
    
    print(f"Successfully created {output_file} with {len(cleaned_rows)} rows.")

    # Create audit file
    audit_file = os.path.join(knowledge_dir, 'cleaning_audit.csv')
    audit_fields = ['source_row', 'product_name_raw', 'raw_route', 'revenue_source', 'profit_source', 'quality_flags']
    with open(audit_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=audit_fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(cleaned_rows)
    
    print(f"Successfully created {audit_file}.")

if __name__ == "__main__":
    run_cleaning()
