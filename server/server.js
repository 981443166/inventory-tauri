const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// ---------- 商品 ----------
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT id, name, price, stock, category, updateTime FROM products').all();
  res.json(rows);
});

app.post('/api/products', (req, res) => {
  const { name, price, category } = req.body;
  if (!name || price == null) return res.status(400).json({ error: '名称和价格必填' });
  const now = new Date().toISOString().slice(0, 10);
  const stmt = db.prepare('INSERT INTO products (name, price, stock, category, updateTime) VALUES (?, ?, 0, ?, ?)');
  const { lastInsertRowid } = stmt.run(name, Number(price), category || '', now);
  res.json({ id: lastInsertRowid, name, price, stock: 0, category, updateTime: now });
});

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- 品牌 ----------
app.get('/api/brands', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM brands').all());
});

app.post('/api/brands', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '名称必填' });
  try {
    const { lastInsertRowid } = db.prepare('INSERT INTO brands (name) VALUES (?)').run(name);
    res.json({ id: lastInsertRowid, name });
  } catch (e) { res.status(400).json({ error: '已存在' }); }
});

app.delete('/api/brands/:id', (req, res) => {
  db.prepare('DELETE FROM brands WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- 分类 ----------
app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM categories').all());
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '名称必填' });
  try {
    const { lastInsertRowid } = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.json({ id: lastInsertRowid, name });
  } catch (e) { res.status(400).json({ error: '已存在' }); }
});

app.delete('/api/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- 单位 ----------
app.get('/api/units', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM units').all());
});

app.post('/api/units', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '名称必填' });
  try {
    const { lastInsertRowid } = db.prepare('INSERT INTO units (name) VALUES (?)').run(name);
    res.json({ id: lastInsertRowid, name });
  } catch (e) { res.status(400).json({ error: '已存在' }); }
});

app.delete('/api/units/:id', (req, res) => {
  db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---------- 出入库记录 ----------
app.get('/api/records', (req, res) => {
  const { type } = req.query; // 'in' 或 'out'
  if (!type) return res.status(400).json({ error: '缺少参数' });
  const rows = db.prepare(`
    SELECT r.id, r.productId, p.name as productName, r.quantity, r.remark, r.createTime
    FROM inventory_records r
    JOIN products p ON r.productId = p.id
    WHERE r.type = ?
    ORDER BY r.id DESC
  `).all(type);
  res.json(rows);
});

app.post('/api/records', (req, res) => {
  const { productId, quantity, remark } = req.body;
  const type = quantity > 0 ? 'in' : 'out';
  const absQty = Math.abs(quantity);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '商品不存在' });

  if (type === 'out' && product.stock < absQty) {
    return res.status(400).json({ error: '库存不足' });
  }

  const updateStock = type === 'in'
    ? db.prepare('UPDATE products SET stock = stock + ?, updateTime = ? WHERE id = ?')
    : db.prepare('UPDATE products SET stock = stock - ?, updateTime = ? WHERE id = ?');
  updateStock.run(absQty, now, productId);

  db.prepare('INSERT INTO inventory_records (productId, type, quantity, remark, createTime) VALUES (?, ?, ?, ?, ?)')
    .run(productId, type, quantity, remark || '', now);

  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));