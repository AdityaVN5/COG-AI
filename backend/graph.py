import sqlite3
import networkx as nx

def build_graph(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    G = nx.Graph()
    nodes_data = {}
    
    def add_node_data(n_id, theme, icon, label, n_type, status, amount, date):
        G.add_node(n_id)
        nodes_data[n_id] = {
            "id": n_id, "theme": theme, "icon": icon, "label": label,
            "data": {"type": n_type, "status": status, "amount": amount, "date": date}
        }

    # Limit orders to keep graph rendering fast
    cur.execute("""
        SELECT salesOrder, soldToParty, totalNetAmount, transactionCurrency, creationDate, overallDeliveryStatus 
        FROM sales_order_headers 
        LIMIT 20
    """)
    orders = cur.fetchall()
    
    for row in orders:
        so, customer, amount, curr, date, status = row
        order_id = f"ORDER_{so}"
        add_node_data(order_id, "primary", "shopping_cart", f"Order {so}", "Sales Order", status or "Pending", f"{amount} {curr}", date[:10] if date else "-")
        
        # Add Customer
        if customer:
            cust_id = f"CUST_{customer}"
            if not G.has_node(cust_id):
                cur.execute("SELECT businessPartnerFullName, creationDate FROM business_partners WHERE businessPartner=?", (customer,))
                c_row = cur.fetchone()
                c_name = c_row[0] if c_row else f"Customer {customer}"
                c_date = c_row[1][:10] if (c_row and c_row[1]) else "-"
                add_node_data(cust_id, "secondary", "person", c_name, "Customer", "Active", "N/A", c_date)
            G.add_edge(cust_id, order_id, dashed=False)
            
        # Add Products for this order
        cur.execute("SELECT material FROM sales_order_items WHERE salesOrder=?", (so,))
        for (prod,) in cur.fetchall():
            prod_id = f"PROD_{prod}"
            if not G.has_node(prod_id):
                cur.execute("SELECT pd.productDescription FROM products p LEFT JOIN product_descriptions pd ON p.product=pd.product WHERE p.product=?", (prod,))
                p_row = cur.fetchone()
                p_desc = p_row[0] if p_row and p_row[0] else f"Product {prod}"
                add_node_data(prod_id, "secondary", "inventory_2", p_desc, "Product", "In Stock", "-", "-")
            G.add_edge(prod_id, order_id, dashed=True)
            
        # Add Deliveries
        cur.execute("SELECT deliveryDocument FROM outbound_delivery_items WHERE referenceSdDocument=?", (so,))
        for (deliv,) in cur.fetchall():
            deliv_id = f"DEL_{deliv}"
            if not G.has_node(deliv_id):
                cur.execute("SELECT creationDate, overallGoodsMovementStatus FROM outbound_delivery_headers WHERE deliveryDocument=?", (deliv,))
                d_row = cur.fetchone()
                d_date = d_row[0][:10] if (d_row and d_row[0]) else "-"
                d_stat = "Completed" if (d_row and d_row[1] == 'C') else "In Transit"
                add_node_data(deliv_id, "primary", "local_shipping", f"Delivery {deliv}", "Logistics", d_stat, "-", d_date)
            G.add_edge(order_id, deliv_id, dashed=False)
            
            # Add Invoices related to Delivery or Order
            cur.execute("SELECT billingDocument FROM billing_document_items WHERE referenceSdDocument=? OR referenceSdDocument=?", (deliv, so))
            for (inv,) in cur.fetchall():
                inv_id = f"INV_{inv}"
                if not G.has_node(inv_id):
                    cur.execute("SELECT totalNetAmount, transactionCurrency, creationDate FROM billing_document_headers WHERE billingDocument=?", (inv,))
                    i_row = cur.fetchone()
                    if i_row:
                        i_amt, i_curr, i_date = i_row
                        add_node_data(inv_id, "tertiary", "description", f"Invoice {inv}", "Billing", "Generated", f"{i_amt} {i_curr}", i_date[:10] if i_date else "-")
                if G.has_node(inv_id):
                    G.add_edge(deliv_id, inv_id, dashed=False)

    conn.close()
    
    # Remove isolated nodes just in case
    G.remove_nodes_from(list(nx.isolates(G)))
    
    # Calculate physics layout
    pos = nx.spring_layout(G, seed=42, k=0.3)
    
    nodes_out = []
    edges_out = []
    
    for n in G.nodes():
        node_info = nodes_data[n]
        # Map logical coordinates to graph bounds in frontend (1500, 1500 is center)
        node_info["x"] = float(pos[n][0]) * 1000 + 1500
        node_info["y"] = float(pos[n][1]) * 1000 + 1500
        nodes_out.append(node_info)
        
    for u, v, data in G.edges(data=True):
        edges_out.append({
            "source": u,
            "target": v,
            "dashed": data.get("dashed", False)
        })
        
    return {"nodes": nodes_out, "edges": edges_out}
