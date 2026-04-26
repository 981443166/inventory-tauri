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
            stock INTEGER NOT NULL,
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
            create_time TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS out_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            remark TEXT,
            create_time TEXT NOT NULL
        )",
        [],
    )?;

    // 插入默认数据
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM brands", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute("INSERT INTO brands (name) VALUES ('得力')", [])?;
        conn.execute("INSERT INTO brands (name) VALUES ('晨光')", [])?;
        conn.execute("INSERT INTO brands (name) VALUES ('惠普')", [])?;
    }

    let count: i32 = conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute("INSERT INTO categories (name) VALUES ('办公用品')", [])?;
        conn.execute("INSERT INTO categories (name) VALUES ('办公设备')", [])?;
        conn.execute("INSERT INTO categories (name) VALUES ('耗材')", [])?;
        conn.execute("INSERT INTO categories (name) VALUES ('其他')", [])?;
    }

    let count: i32 = conn.query_row("SELECT COUNT(*) FROM units", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute("INSERT INTO units (name) VALUES ('个')", [])?;
        conn.execute("INSERT INTO units (name) VALUES ('盒')", [])?;
        conn.execute("INSERT INTO units (name) VALUES ('箱')", [])?;
        conn.execute("INSERT INTO units (name) VALUES ('包')", [])?;
        conn.execute("INSERT INTO units (name) VALUES ('台')", [])?;
    }

    let count: i32 = conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute(
            "INSERT INTO products (name, price, stock, category, update_time) VALUES ('笔记本', 5.0, 120, '办公用品', '2026-04-25')",
            [],
        )?;
        conn.execute(
            "INSERT INTO products (name, price, stock, category, update_time) VALUES ('签字笔', 2.0, 300, '办公用品', '2026-04-24')",
            [],
        )?;
        conn.execute(
            "INSERT INTO products (name, price, stock, category, update_time) VALUES ('文件夹', 8.0, 85, '办公用品', '2026-04-23')",
            [],
        )?;
        conn.execute(
            "INSERT INTO products (name, price, stock, category, update_time) VALUES ('打印机硒鼓', 120.0, 15, '办公设备', '2026-04-22')",
            [],
        )?;
        conn.execute(
            "INSERT INTO products (name, price, stock, category, update_time) VALUES ('A4打印纸', 25.0, 60, '办公用品', '2026-04-21')",
            [],
        )?;
    }

    Ok(())
}

fn get_conn(state: &State<'_, AppState>) -> Result<Connection, String> {
    let db_path = get_db_path(state);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    init_db_tables(&conn).map_err(|e| e.to_string())?;
    Ok(conn)
}

#[derive(Debug, Serialize, Deserialize)]
struct Product {
    id: i32,
    name: String,
    price: f64,
    stock: i32,
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
    remark: String,
    #[serde(rename = "createTime")]
    #[serde(default)]
    create_time: Option<String>,
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
        .prepare("SELECT id, name, price, stock, category, update_time FROM products")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                price: row.get(2)?,
                stock: row.get(3)?,
                category: row.get(4)?,
                update_time: row.get(5)?,
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
        "INSERT INTO products (name, price, stock, category, update_time) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![product.name, product.price, product.stock, product.category, product.update_time],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(Product { id: id as i32, ..product })
}

#[tauri::command]
fn update_product(product: Product, state: State<'_, AppState>) -> Result<Product, String> {
    let conn = get_conn(&state)?;
    conn.execute(
        "UPDATE products SET name = ?, price = ?, stock = ?, category = ?, update_time = ? WHERE id = ?",
        rusqlite::params![product.name, product.price, product.stock, product.category, product.update_time, product.id],
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
    let query = format!(
        "SELECT id, product_id, quantity, remark, create_time FROM {}",
        table
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Record {
                id: row.get(0)?,
                product_id: row.get(1)?,
                quantity: row.get(2)?,
                remark: row.get(3)?,
                create_time: row.get(4)?,
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

    conn.execute(
        &format!(
            "INSERT INTO {} (product_id, quantity, remark, create_time) VALUES (?, ?, ?, ?)",
            table
        ),
        rusqlite::params![record.product_id, quantity, record.remark, create_time],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    let stock_change = if table == "in_records" {
        quantity
    } else {
        -quantity
    };
    conn.execute(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        rusqlite::params![stock_change, record.product_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(Record {
        id: Some(id as i32),
        create_time: Some(create_time),
        ..record
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
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
            add_record
        ))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
