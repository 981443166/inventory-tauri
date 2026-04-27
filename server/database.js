const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'inventory.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    category TEXT,
    brand TEXT,
    unit TEXT,
    updateTime TEXT
  );

  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS inventory_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in','out')),
    quantity INTEGER NOT NULL,
    remark TEXT,
    createTime TEXT NOT NULL,
    FOREIGN KEY (productId) REFERENCES products(id)
  );
`);

// 数据迁移：检查并添加 brand 和 unit 列（如果不存在）
const migrateProducts = () => {
  try {
    // 检查 brand 列是否存在
    const brandColumn = db.prepare("PRAGMA table_info(products)").all().find(col => col.name === 'brand');
    if (!brandColumn) {
      db.prepare("ALTER TABLE products ADD COLUMN brand TEXT").run();
      console.log('已添加 brand 列');
    }
    
    // 检查 unit 列是否存在
    const unitColumn = db.prepare("PRAGMA table_info(products)").all().find(col => col.name === 'unit');
    if (!unitColumn) {
      db.prepare("ALTER TABLE products ADD COLUMN unit TEXT").run();
      console.log('已添加 unit 列');
    }
    
    // 为现有商品设置默认值
    const defaultBrand = db.prepare("SELECT name FROM brands LIMIT 1").get();
    const defaultUnit = db.prepare("SELECT name FROM units LIMIT 1").get();
    
    if (defaultBrand) {
      db.prepare("UPDATE products SET brand = ? WHERE brand IS NULL OR brand = ''").run(defaultBrand.name);
    }
    if (defaultUnit) {
      db.prepare("UPDATE products SET unit = ? WHERE unit IS NULL OR unit = ''").run(defaultUnit.name);
    }
  } catch (e) {
    console.error('数据迁移失败:', e);
  }
};

migrateProducts();

module.exports = db;