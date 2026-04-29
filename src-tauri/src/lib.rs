use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

struct AppState {
    db_path: Mutex<PathBuf>,
}

fn get_db_path(state: &State<'_, AppState>) -> PathBuf {
    state.db_path.lock().unwrap().clone()
}

fn init_db_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            cost_price REAL NOT NULL DEFAULT 0,
            stock INTEGER NOT NULL DEFAULT 0,
            brand TEXT,
            unit TEXT,
            category TEXT NOT NULL,
            update_time TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS units (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS in_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            remark TEXT,
            supplier_name TEXT DEFAULT '',
            doc_type TEXT DEFAULT 'purchase',
            create_time TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS out_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL DEFAULT 0,
            total_amount REAL NOT NULL DEFAULT 0,
            remark TEXT,
            recipient_name TEXT DEFAULT '',
            create_time TEXT NOT NULL
        )",
        [],
    )?;

    // 库存流水表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS stock_flow (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            before_stock INTEGER NOT NULL,
            after_stock INTEGER NOT NULL,
            destination TEXT DEFAULT '',
            operator TEXT NOT NULL,
            remark TEXT,
            create_time TEXT NOT NULL
        )",
        [],
    )?;

    // 迁移：为已有表添加新列（如果不存在）
    let migrations = [
        "ALTER TABLE in_records ADD COLUMN supplier_name TEXT DEFAULT ''",
        "ALTER TABLE in_records ADD COLUMN doc_type TEXT DEFAULT 'purchase'",
        "ALTER TABLE out_records ADD COLUMN recipient_name TEXT DEFAULT ''",
        "ALTER TABLE out_records ADD COLUMN unit_price REAL NOT NULL DEFAULT 0",
        "ALTER TABLE out_records ADD COLUMN total_amount REAL NOT NULL DEFAULT 0",
        "ALTER TABLE stock_flow ADD COLUMN destination TEXT DEFAULT ''",
        "ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0",
    ];
    for sql in &migrations {
        // ALTER TABLE ADD COLUMN 在列已存在时会报错，忽略即可
        let _ = conn.execute(sql, []);
    }

    Ok(())
}

fn get_conn(state: &State<'_, AppState>) -> Result<Connection, String> {
    let db_path = get_db_path(state);
    Connection::open(&db_path).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
struct Product {
    id: i32,
    name: String,
    price: f64,
    #[serde(rename = "costPrice", default)]
    cost_price: f64,
    stock: i32,
    #[serde(default)]
    brand: String,
    #[serde(default)]
    unit: String,
    category: String,
    update_time: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Brand {
    id: i32,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Category {
    id: i32,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Unit {
    id: i32,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Record {
    id: Option<i32>,
    #[serde(rename = "productId")]
    product_id: i32,
    quantity: i32,
    #[serde(rename = "unitPrice", default)]
    unit_price: f64,
    #[serde(rename = "totalAmount", default)]
    total_amount: f64,
    remark: String,
    #[serde(rename = "recipientName", default)]
    recipient_name: String,
    #[serde(rename = "supplierName", default)]
    supplier_name: String,
    #[serde(rename = "docType", default)]
    doc_type: String,
    #[serde(rename = "createTime")]
    #[serde(default)]
    create_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StockFlow {
    id: i32,
    #[serde(rename = "productId")]
    product_id: i32,
    #[serde(rename = "productName")]
    product_name: String,
    #[serde(rename = "type")]
    flow_type: String,
    quantity: i32,
    #[serde(rename = "beforeStock")]
    before_stock: i32,
    #[serde(rename = "afterStock")]
    after_stock: i32,
    #[serde(default)]
    destination: String,
    operator: String,
    remark: String,
    #[serde(rename = "createTime")]
    create_time: String,
}

#[tauri::command]
fn init_database(state: State<'_, AppState>) -> Result<(), String> {
    let conn = get_conn(&state)?;
    init_db_tables(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_products(state: State<'_, AppState>) -> Result<Vec<Product>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, name, price, cost_price, stock, brand, unit, category, update_time FROM products")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                price: row.get(2)?,
                cost_price: row.get(3).unwrap_or(0.0),
                stock: row.get(4)?,
                brand: row.get(5).unwrap_or_default(),
                unit: row.get(6).unwrap_or_default(),
                category: row.get(7)?,
                update_time: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn add_product(product: Product, state: State<'_, AppState>) -> Result<Product, String> {
    let conn = get_conn(&state)?;
    conn.execute(
        "INSERT INTO products (name, price, cost_price, stock, brand, unit, category, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![product.name, product.price, product.cost_price, product.stock, product.brand, product.unit, product.category, product.update_time],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(Product { id: id as i32, ..product })
}

#[tauri::command]
fn update_product(product: Product, state: State<'_, AppState>) -> Result<Product, String> {
    let conn = get_conn(&state)?;
    conn.execute(
        "UPDATE products SET name = ?, price = ?, cost_price = ?, stock = ?, brand = ?, unit = ?, category = ?, update_time = ? WHERE id = ?",
        rusqlite::params![product.name, product.price, product.cost_price, product.stock, product.brand, product.unit, product.category, product.update_time, product.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(product)
}

#[tauri::command]
fn delete_product(id: i32, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM products WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_brands(state: State<'_, AppState>) -> Result<Vec<Brand>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM brands")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Brand {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn add_brand(brand: String, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("INSERT INTO brands (name) VALUES (?)", [&brand])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_brand(id: i32, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM brands WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM categories")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn add_category(category: String, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("INSERT INTO categories (name) VALUES (?)", [&category])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_category(id: i32, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM categories WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_units(state: State<'_, AppState>) -> Result<Vec<Unit>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM units")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Unit {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn add_unit(unit: String, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("INSERT INTO units (name) VALUES (?)", [&unit])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_unit(id: i32, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM units WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_records(r#type: String, state: State<'_, AppState>) -> Result<Vec<Record>, String> {
    let conn = get_conn(&state)?;
    let table = if r#type == "in" {
        "in_records"
    } else {
        "out_records"
    };

    if table == "in_records" {
        let mut stmt = conn
            .prepare("SELECT id, product_id, quantity, remark, supplier_name, doc_type, create_time FROM in_records")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Record {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    quantity: row.get(2)?,
                    unit_price: 0.0,
                    total_amount: 0.0,
                    remark: row.get(3)?,
                    supplier_name: row.get(4)?,
                    doc_type: row.get(5)?,
                    recipient_name: String::new(),
                    create_time: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|e| e.to_string())?);
        }
        Ok(result)
    } else {
        let mut stmt = conn
            .prepare("SELECT id, product_id, quantity, unit_price, total_amount, remark, recipient_name, create_time FROM out_records")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Record {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    quantity: row.get(2)?,
                    unit_price: row.get(3).unwrap_or(0.0),
                    total_amount: row.get(4).unwrap_or(0.0),
                    remark: row.get(5)?,
                    recipient_name: row.get(6)?,
                    supplier_name: String::new(),
                    create_time: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }
}

#[tauri::command]
fn add_record(record: Record, state: State<'_, AppState>) -> Result<Record, String> {
    let conn = get_conn(&state)?;

    let table = if record.quantity > 0 {
        "in_records"
    } else {
        "out_records"
    };
    let quantity = if record.quantity < 0 {
        -record.quantity
    } else {
        record.quantity
    };

    let create_time = record
        .create_time
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string());

    // 插入记录时带上去向/来源字段
    if table == "in_records" {
        conn.execute(
            "INSERT INTO in_records (product_id, quantity, remark, supplier_name, doc_type, create_time) VALUES (?, ?, ?, ?, ?, ?)",
            rusqlite::params![record.product_id, quantity, record.remark, record.supplier_name, record.doc_type, create_time],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO out_records (product_id, quantity, unit_price, total_amount, remark, recipient_name, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![record.product_id, quantity, record.unit_price, record.total_amount, record.remark, record.recipient_name, create_time],
        )
        .map_err(|e| e.to_string())?;
    }

    let id = conn.last_insert_rowid();

    let stock_change = if table == "in_records" {
        quantity
    } else {
        -quantity
    };

    // 获取变动前库存
    let before_stock: i32 = conn
        .query_row("SELECT stock FROM products WHERE id = ?", [record.product_id], |row| row.get(0))
        .unwrap_or(0);

    conn.execute(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        rusqlite::params![stock_change, record.product_id],
    )
    .map_err(|e| e.to_string())?;

    // 获取变动后库存
    let after_stock: i32 = before_stock + stock_change;

    // 获取商品名称
    let product_name: String = conn
        .query_row("SELECT name FROM products WHERE id = ?", [record.product_id], |row| row.get(0))
        .unwrap_or_else(|_| "未知商品".to_string());

    // 出入去向：出库→收货人，入库→供应商
    let destination = if table == "out_records" {
        record.recipient_name.clone()
    } else {
        record.supplier_name.clone()
    };

    // 自动插入库存流水记录（包含去向）
    let flow_type = if table == "in_records" { "in" } else { "out" };
    conn.execute(
        "INSERT INTO stock_flow (product_id, product_name, type, quantity, before_stock, after_stock, destination, operator, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            record.product_id, product_name, flow_type, quantity,
            before_stock, after_stock, destination, "系统用户", record.remark, create_time
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Record {
        id: Some(id as i32),
        create_time: Some(create_time),
        ..record
    })
}

#[tauri::command]
fn add_stock_flow(flow: StockFlow, state: State<'_, AppState>) -> Result<StockFlow, String> {
    let conn = get_conn(&state)?;
    conn.execute(
        "INSERT INTO stock_flow (product_id, product_name, type, quantity, before_stock, after_stock, destination, operator, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            flow.product_id, flow.product_name, flow.flow_type, flow.quantity,
            flow.before_stock, flow.after_stock, flow.destination, flow.operator, flow.remark, flow.create_time
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(StockFlow { id: id as i32, ..flow })
}

#[derive(Debug, Serialize, Deserialize)]
struct StockFlowFilter {
    #[serde(rename = "productId", default)]
    product_id: Option<i32>,
    #[serde(rename = "type", default)]
    flow_type: Option<String>,
    #[serde(rename = "startDate", default)]
    start_date: Option<String>,
    #[serde(rename = "endDate", default)]
    end_date: Option<String>,
}

#[tauri::command]
fn get_stock_flows(filter: Option<StockFlowFilter>, state: State<'_, AppState>) -> Result<Vec<StockFlow>, String> {
    let conn = get_conn(&state)?;

    let mut sql = String::from(
        "SELECT id, product_id, product_name, type, quantity, before_stock, after_stock, destination, operator, remark, create_time FROM stock_flow WHERE 1=1"
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(f) = &filter {
        if let Some(pid) = f.product_id {
            sql.push_str(" AND product_id = ?");
            param_values.push(Box::new(pid));
        }
        if let Some(ref ft) = f.flow_type {
            if ft != "all" && !ft.is_empty() {
                sql.push_str(" AND type = ?");
                param_values.push(Box::new(ft.clone()));
            }
        }
        if let Some(ref sd) = f.start_date {
            if !sd.is_empty() {
                sql.push_str(" AND create_time >= ?");
                param_values.push(Box::new(format!("{} 00:00:00", sd)));
            }
        }
        if let Some(ref ed) = f.end_date {
            if !ed.is_empty() {
                sql.push_str(" AND create_time <= ?");
                param_values.push(Box::new(format!("{} 23:59:59", ed)));
            }
        }
    }

    sql.push_str(" ORDER BY create_time DESC");

    let params: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params.as_slice(), |row| {
            Ok(StockFlow {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                flow_type: row.get(3)?,
                quantity: row.get(4)?,
                before_stock: row.get(5)?,
                after_stock: row.get(6)?,
                destination: row.get(7)?,
                operator: row.get(8)?,
                remark: row.get(9)?,
                create_time: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let db_path = app_data_dir.join("inventory.db");
            app.manage(AppState {
                db_path: Mutex::new(db_path),
            });

            // 初始化数据库
            let state: State<AppState> = app.state();
            let conn = Connection::open(get_db_path(&state)).expect("Failed to open database");
            init_db_tables(&conn).expect("Failed to initialize database tables");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler!(
            init_database,
            get_products,
            add_product,
            update_product,
            delete_product,
            get_brands,
            add_brand,
            delete_brand,
            get_categories,
            add_category,
            delete_category,
            get_units,
            add_unit,
            delete_unit,
            get_records,
            add_record,
            add_stock_flow,
            get_stock_flows,
            close_window,
            minimize_window,
            maximize_window
        ))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
