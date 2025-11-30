import Database from 'better-sqlite3';
import path from 'path';

console.log('测试better-sqlite3...');
try {
  const dbPath = path.join(process.cwd(), 'test.db');
  const db = new Database(dbPath);
  console.log('数据库连接成功!');
  
  // 创建测试表
  db.exec(`CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)`);
  console.log('创建表成功!');
  
  // 插入数据
  const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
  const info = stmt.run('测试数据');
  console.log('插入数据成功! 插入的ID:', info.lastInsertRowid);
  
  // 查询数据
  const row = db.prepare('SELECT * FROM test WHERE id = ?').get(info.lastInsertRowid);
  console.log('查询结果:', row);
  
  db.close();
  console.log('测试成功完成!');
} catch (error) {
  console.error('测试失败:', error);
}