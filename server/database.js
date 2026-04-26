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

// 插入默认数据（如果对应表为空）
const insertIfEmpty = (table, values) => {
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  if (count === 0) {
    const stmt = db.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
    values.forEach(v => stmt.run(v));
  }
};

insertIfEmpty('categories', ['办公用品', '办公设备', '耗材', '其他']);
insertIfEmpty('brands', ['得力', '晨光', '惠普']);
insertIfEmpty('units', ['个', '盒', '箱', '包', '台']);

module.exports = db;