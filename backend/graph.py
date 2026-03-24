import sqlite3
import networkx as nx

def build_graph(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    G = nx.DiGraph()
    nodes_data = {}
    
    def add_node_data(n_id, theme, icon, label, n_type, sections):
        G.add_node(n_id)
        nodes_data[n_id] = {
            "id": n_id, "theme": theme, "icon": icon, "label": label,
            "data": {"type": n_type, "sections": sections}
        }

    # Limit orders to keep graph rendering fast
    cur.execute("""
        SELECT salesOrder, salesOrderType, createdByUser, creationDate, requestedDeliveryDate, pricingDate,
               totalNetAmount, transactionCurrency, customerPaymentTerms, incotermsClassification, incotermsLocation1,
               overallDeliveryStatus, overallOrdReltdBillgStatus, deliveryBlockReason, headerBillingBlockReason, soldToParty
        FROM sales_order_headers 
        LIMIT 20
    """)
    orders = cur.fetchall()
    
    for row in orders:
        so, so_type, created_by, creation_date, req_delivery_date, pricing_date, net_amount, curr, payment_terms, incoterms_class, incoterms_loc, delivery_status, billing_status, delivery_block, billing_block, customer = row
        order_id = f"ORDER_{so}"
        
        # Items
        cur.execute("SELECT material, requestedQuantity, requestedQuantityUnit, netAmount, productionPlant FROM sales_order_items WHERE salesOrder=?", (so,))
        items = cur.fetchall()
        item_fields = []
        for mat, qty, unit, namt, plant in items:
            item_fields.append({"label": f"Material {mat}", "value": f"{qty} {unit} | {namt} {curr} | Plant {plant}"})
            
        sections = [
            {"title": "HEADER", "fields": [
                {"label": "Sales Order ID", "value": so},
                {"label": "Order Type", "value": so_type},
                {"label": "Created By", "value": created_by},
                {"label": "Creation Date", "value": creation_date},
                {"label": "Requested Delivery", "value": req_delivery_date},
                {"label": "Pricing Date", "value": pricing_date}
            ]},
            {"title": "FINANCIALS", "fields": [
                {"label": "Total Net Amount", "value": f"{net_amount} {curr}"},
                {"label": "Payment Terms", "value": payment_terms},
                {"label": "Incoterms", "value": f"{incoterms_class} {incoterms_loc}"}
            ]},
            {"title": "STATUS FLAGS", "fields": [
                {"label": "Delivery Status", "value": delivery_status},
                {"label": "Billing Status", "value": billing_status},
                {"label": "Delivery Block", "value": f"⚠️ {delivery_block}" if delivery_block else ""},
                {"label": "Billing Block", "value": f"⚠️ {billing_block}" if billing_block else ""}
            ]},
            {"title": "ITEMS", "fields": item_fields}
        ]
        
        # clean empty values from special flags
        for sec in sections:
            sec["fields"] = [f for f in sec["fields"] if f["value"]]
            
        add_node_data(order_id, "order", "shopping_cart", f"Order {so}", "Sales Order", sections)
        
        # Add Customer
        if customer:
            cust_id = f"CUST_{customer}"
            if not G.has_node(cust_id):
                cur.execute("""
                    SELECT bp.businessPartnerFullName, bp.businessPartnerCategory, bp.creationDate, bp.lastChangeDate,
                           bpa.streetName, bpa.cityName, bpa.region, bpa.postalCode, bpa.country,
                           bp.businessPartnerIsBlocked, bp.isMarkedForArchiving
                    FROM business_partners bp
                    LEFT JOIN business_partner_addresses bpa ON bp.businessPartner = bpa.businessPartner
                    WHERE bp.businessPartner=?
                """, (customer,))
                c_row = cur.fetchone()
                if c_row:
                    full_name, category, created_on, last_changed, street, city, region, postal, country, blocked, archived = c_row
                    
                    cur.execute("SELECT customerPaymentTerms FROM customer_sales_area_assignments WHERE customer=?", (customer,))
                    pt_row = cur.fetchone()
                    payment_terms_cust = pt_row[0] if pt_row else ""
                    
                    cur.execute("SELECT reconciliationAccount, customerAccountGroup FROM customer_company_assignments WHERE customer=?", (customer,))
                    rec_row = cur.fetchone()
                    reconciliation_account, account_group = rec_row if rec_row else ("", "")

                    c_sections = [
                        {"title": "IDENTITY", "fields": [
                            {"label": "Full Name", "value": full_name},
                            {"label": "Partner ID", "value": customer},
                            {"label": "Category", "value": category},
                            {"label": "Created On", "value": created_on},
                            {"label": "Last Changed", "value": last_changed}
                        ]},
                        {"title": "ADDRESS", "fields": [
                            {"label": "Street", "value": street},
                            {"label": "City", "value": city},
                            {"label": "Region", "value": region},
                            {"label": "Postal Code", "value": postal},
                            {"label": "Country", "value": country}
                        ]},
                        {"title": "ACCOUNT", "fields": [
                            {"label": "Payment Terms", "value": payment_terms_cust},
                            {"label": "Reconciliation Acc", "value": reconciliation_account},
                            {"label": "Account Group", "value": account_group},
                            {"label": "Blocked", "value": "🔴" if blocked == '1' or blocked == 'true' or blocked == 1 else ""},
                            {"label": "Marked for Archive", "value": "Yes" if archived == '1' or archived == 'true' or archived == 1 else ""}
                        ]}
                    ]
                    for sec in c_sections:
                        sec["fields"] = [f for f in sec["fields"] if f.get("value") or f.get("value") == 0]
                        
                    add_node_data(cust_id, "customer", "person", full_name or f"Customer {customer}", "Customer", c_sections)
            if G.has_node(cust_id):
                G.add_edge(cust_id, order_id, dashed=False)
            
        # Add Products for this order
        for mat, _, _, _, _ in items:
            prod_id = f"PROD_{mat}"
            if not G.has_node(prod_id):
                cur.execute("""
                    SELECT p.productType, p.productGroup, p.division, p.industrySector,
                           p.grossWeight, p.weightUnit, p.netWeight, p.baseUnit,
                           pd.productDescription, p.productOldId
                    FROM products p 
                    LEFT JOIN product_descriptions pd ON p.product=pd.product 
                    WHERE p.product=?
                """, (mat,))
                p_row = cur.fetchone()
                if p_row:
                    p_type, p_group, division, ind_sector, g_weight, w_unit, n_weight, b_unit, p_desc, old_id = p_row
                    
                    cur.execute("SELECT plant, profitCenter, availabilityCheckType, mrpType, countryOfOrigin FROM product_plants WHERE product=?", (mat,))
                    pl_row = cur.fetchone()
                    plant_id, profit_ctr, avail_chk, mrp_type, country_origin = pl_row if pl_row else ("", "", "", "", "")
                    
                    p_sections = [
                        {"title": "IDENTITY", "fields": [
                            {"label": "Product ID", "value": mat},
                            {"label": "Description", "value": p_desc},
                            {"label": "Old Product ID", "value": old_id},
                            {"label": "Product Type", "value": p_type},
                            {"label": "Product Group", "value": p_group},
                            {"label": "Division", "value": division},
                            {"label": "Industry Sector", "value": ind_sector}
                        ]},
                        {"title": "PHYSICAL", "fields": [
                            {"label": "Gross Weight", "value": f"{g_weight} {w_unit}" if g_weight else ""},
                            {"label": "Net Weight", "value": f"{n_weight} {w_unit}" if n_weight else ""},
                            {"label": "Base Unit", "value": b_unit}
                        ]},
                        {"title": "PLANT INFO", "fields": [
                            {"label": "Plant", "value": plant_id},
                            {"label": "Profit Center", "value": profit_ctr},
                            {"label": "Availability Check", "value": avail_chk},
                            {"label": "MRP Type", "value": mrp_type},
                            {"label": "Country of Origin", "value": country_origin}
                        ]}
                    ]
                    for sec in p_sections:
                        sec["fields"] = [f for f in sec["fields"] if str(f.get("value", "")).strip()]
                        
                    add_node_data(prod_id, "product", "inventory_2", p_desc or f"Product {mat}", "Product", p_sections)
            if G.has_node(prod_id):
                G.add_edge(prod_id, order_id, dashed=True)
            
        # Add Deliveries
        cur.execute("SELECT deliveryDocument FROM outbound_delivery_items WHERE referenceSdDocument=?", (so,))
        for (deliv,) in cur.fetchall():
            deliv_id = f"DEL_{deliv}"
            if not G.has_node(deliv_id):
                cur.execute("""
                    SELECT shippingPoint, creationDate, overallGoodsMovementStatus, overallPickingStatus, 
                           actualGoodsMovementDate, overallProofOfDeliveryStatus, deliveryBlockReason, headerBillingBlockReason
                    FROM outbound_delivery_headers WHERE deliveryDocument=?
                """, (deliv,))
                d_row = cur.fetchone()
                if d_row:
                    shp_pt, d_date, goods_stat, pick_stat, act_date, pod_stat, d_block, b_block = d_row
                    
                    cur.execute("SELECT plant, storageLocation, actualDeliveryQuantity, deliveryQuantityUnit, referenceSdDocument, itemBillingBlockReason FROM outbound_delivery_items WHERE deliveryDocument=?", (deliv,))
                    d_items = cur.fetchall()
                    d_item_fields = []
                    for d_pl, d_sl, d_qty, d_uom, d_ref, d_blk in d_items:
                        d_item_fields.append({"label": f"Plant {d_pl}", "value": f"{d_qty} {d_uom} | Loc: {d_sl} | Ref: {d_ref}" + (f" | ⚠️ {d_blk}" if d_blk else "")})

                    d_sections = [
                        {"title": "HEADER", "fields": [
                            {"label": "Delivery Document", "value": deliv},
                            {"label": "Shipping Point", "value": shp_pt},
                            {"label": "Created On", "value": d_date}
                        ]},
                        {"title": "STATUS", "fields": [
                            {"label": "Goods Movement", "value": goods_stat},
                            {"label": "Picking Status", "value": pick_stat},
                            {"label": "Actual Movement Date", "value": act_date},
                            {"label": "Proof of Delivery", "value": pod_stat},
                            {"label": "Delivery Block", "value": f"⚠️ {d_block}" if d_block else ""},
                            {"label": "Billing Block", "value": f"⚠️ {b_block}" if b_block else ""}
                        ]},
                        {"title": "ITEM DETAILS", "fields": d_item_fields}
                    ]
                    for sec in d_sections:
                        sec["fields"] = [f for f in sec["fields"] if f.get("value")]
                        
                    add_node_data(deliv_id, "logistics", "local_shipping", f"Delivery {deliv}", "Logistics", d_sections)
            if G.has_node(deliv_id):
                G.add_edge(order_id, deliv_id, dashed=False)
            
            # Add Invoices related to Delivery or Order
            cur.execute("SELECT billingDocument FROM billing_document_items WHERE referenceSdDocument=? OR referenceSdDocument=?", (deliv, so))
            for (inv,) in cur.fetchall():
                inv_id = f"INV_{inv}"
                if not G.has_node(inv_id):
                    cur.execute("""
                        SELECT billingDocumentType, billingDocumentDate, creationDate, lastChangeDateTime,
                               totalNetAmount, transactionCurrency, companyCode, fiscalYear, accountingDocument,
                               billingDocumentIsCancelled, cancelledBillingDocument
                        FROM billing_document_headers WHERE billingDocument=?
                    """, (inv,))
                    i_row = cur.fetchone()
                    if i_row:
                        i_type, i_date, i_create, i_change, i_net, i_curr, i_ccode, i_fyear, i_acct_doc, i_cancel, i_cancel_ref = i_row
                        
                        cur.execute("SELECT material, billingQuantity, billingQuantityUnit, netAmount, referenceSdDocument FROM billing_document_items WHERE billingDocument=?", (inv,))
                        i_items = cur.fetchall()
                        i_item_fields = []
                        for i_mat, i_qty, i_uom, i_amt, i_ref in i_items:
                            i_item_fields.append({"label": f"Material {i_mat}", "value": f"{i_qty} {i_uom} | {i_amt} {i_curr} | Ref: {i_ref}"})
                            
                        i_sections = [
                            {"title": "HEADER", "fields": [
                                {"label": "Billing Document", "value": inv},
                                {"label": "Document Type", "value": i_type},
                                {"label": "Billing Date", "value": i_date},
                                {"label": "Created On", "value": i_create},
                                {"label": "Last Changed", "value": i_change}
                            ]},
                            {"title": "FINANCIALS", "fields": [
                                {"label": "Net Amount", "value": f"{i_net} {i_curr}" if i_net else ""},
                                {"label": "Company Code", "value": i_ccode},
                                {"label": "Fiscal Year", "value": i_fyear},
                                {"label": "Accounting Doc", "value": i_acct_doc}
                            ]},
                            {"title": "STATUS", "fields": [
                                {"label": "Cancelled?", "value": "🔴 CANCELLED" if i_cancel == '1' or i_cancel == 1 or i_cancel == 'true' else ""},
                                {"label": "Cancelled Doc Ref", "value": i_cancel_ref}
                            ]},
                            {"title": "LINE ITEMS", "fields": i_item_fields}
                        ]
                        for sec in i_sections:
                            sec["fields"] = [f for f in sec["fields"] if str(f.get("value")).strip()]
                            
                        add_node_data(inv_id, "billing", "receipt_long", f"Invoice {inv}", "Billing", i_sections)
                        
                        # Add Journal Entry
                        if i_acct_doc:
                            je_id = f"JE_{i_acct_doc}"
                            if not G.has_node(je_id):
                                cur.execute("""
                                    SELECT accountingDocumentType, glAccount, fiscalYear, companyCode,
                                           postingDate, documentDate, lastChangeDateTime,
                                           amountInTransactionCurrency, transactionCurrency, amountInCompanyCodeCurrency,
                                           profitCenter, financialAccountType, clearingDate, clearingAccountingDocument, referenceDocument
                                    FROM journal_entry_items_accounts_receivable WHERE accountingDocument=?
                                """, (i_acct_doc,))
                                je_row = cur.fetchone()
                                if je_row:
                                    je_type, je_gl, je_fy, je_cc, je_post, je_doc, je_change, je_amt_txn, je_curr, je_amt_cc, je_pc, je_fat, je_clear_date, je_clear_doc, je_ref = je_row
                                    
                                    je_sections = [
                                        {"title": "IDENTITY", "fields": [
                                            {"label": "Accounting Document", "value": i_acct_doc},
                                            {"label": "Document Type", "value": je_type},
                                            {"label": "GL Account", "value": je_gl},
                                            {"label": "Fiscal Year", "value": je_fy},
                                            {"label": "Company Code", "value": je_cc}
                                        ]},
                                        {"title": "DATES", "fields": [
                                            {"label": "Posting Date", "value": je_post},
                                            {"label": "Document Date", "value": je_doc},
                                            {"label": "Last Changed", "value": je_change}
                                        ]},
                                        {"title": "FINANCIALS", "fields": [
                                            {"label": "Amount (TXN)", "value": f"{je_amt_txn} {je_curr}" if je_amt_txn else ""},
                                            {"label": "Amount (Company)", "value": je_amt_cc},
                                            {"label": "Profit Center", "value": je_pc},
                                            {"label": "Financial Acct Type", "value": je_fat}
                                        ]},
                                        {"title": "CLEARING", "fields": [
                                            {"label": "Cleared?", "value": je_clear_date},
                                            {"label": "Clearing Doc", "value": je_clear_doc},
                                            {"label": "Reference Document", "value": je_ref}
                                        ]}
                                    ]
                                    for sec in je_sections:
                                        sec["fields"] = [f for f in sec["fields"] if f.get("value")]

                                    add_node_data(je_id, "journal", "account_balance_wallet", f"Journal {i_acct_doc}", "Journal Entry", je_sections)
                                    
                                    # Add Payment Node if cleared
                                    if je_clear_doc and str(je_clear_doc).strip():
                                        pay_id = f"PAY_{je_clear_doc}"
                                        if not G.has_node(pay_id):
                                            cur.execute("""
                                                SELECT clearingDocFiscalYear, clearingDate, postingDate, documentDate,
                                                       amountInTransactionCurrency, transactionCurrency, amountInCompanyCodeCurrency,
                                                       glAccount, profitCenter, financialAccountType, customer, invoiceReference,
                                                       salesDocument, assignmentReference
                                                FROM payments_accounts_receivable WHERE clearingAccountingDocument=?
                                            """, (je_clear_doc,))
                                            pay_row = cur.fetchone()
                                            if pay_row:
                                                p_fy, p_cdate, p_pdate, p_ddate, p_amttxn, p_curr, p_amtcc, p_gl, p_pc, p_fat, p_cust, p_invref, p_sdoc, p_assref = pay_row
                                                pay_sections = [
                                                    {"title": "IDENTITY", "fields": [
                                                        {"label": "Accounting Document", "value": je_clear_doc},
                                                        {"label": "Clearing Document", "value": je_clear_doc},
                                                        {"label": "Fiscal Year", "value": p_fy}
                                                    ]},
                                                    {"title": "DATES", "fields": [
                                                        {"label": "Clearing Date", "value": p_cdate},
                                                        {"label": "Posting Date", "value": p_pdate},
                                                        {"label": "Document Date", "value": p_ddate}
                                                    ]},
                                                    {"title": "FINANCIALS", "fields": [
                                                        {"label": "Amount Paid (TXN)", "value": f"{p_amttxn} {p_curr}" if p_amttxn else ""},
                                                        {"label": "Amount (Company)", "value": p_amtcc},
                                                        {"label": "GL Account", "value": p_gl},
                                                        {"label": "Profit Center", "value": p_pc},
                                                        {"label": "Financial Acct Type", "value": p_fat}
                                                    ]},
                                                    {"title": "REFERENCES", "fields": [
                                                        {"label": "Customer", "value": p_cust},
                                                        {"label": "Invoice Reference", "value": p_invref},
                                                        {"label": "Sales Document", "value": p_sdoc},
                                                        {"label": "Assignment Ref", "value": p_assref}
                                                    ]}
                                                ]
                                                for sec in pay_sections:
                                                    sec["fields"] = [f for f in sec["fields"] if str(f.get("value")).strip()]
                                                    
                                                add_node_data(pay_id, "payment", "paid", f"Payment {je_clear_doc}", "Payment", pay_sections)
                                                
                                                if p_cust:
                                                    cust_node_id = f"CUST_{p_cust}"
                                                    if G.has_node(cust_node_id):
                                                        G.add_edge(pay_id, cust_node_id, dashed=True)
                                        
                                        if G.has_node(pay_id):
                                            G.add_edge(je_id, pay_id, dashed=False)
                            if G.has_node(je_id):
                                G.add_edge(inv_id, je_id, dashed=False)
                if G.has_node(inv_id) and G.has_node(deliv_id):
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
