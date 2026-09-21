const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const sourceFile = path.join(__dirname, 'users.json');
const dbPath = path.join(__dirname, 'nexumservice.db');

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content ? JSON.parse(content) : [];
  } catch (error) {
    return [];
  }
}

function parseJsonValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

const users = readJson(sourceFile);
const db = new Database(dbPath);

const createTable = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    email TEXT UNIQUE,
    password TEXT,
    passwordHash TEXT,
    telefono TEXT,
    pais TEXT,
    role TEXT,
    tipo TEXT,
    status TEXT,
    emailVerifiedAt TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    descripcion TEXT,
    direccion TEXT,
    horario TEXT,
    precio TEXT,
    foto TEXT,
    trabajos TEXT,
    favoritos TEXT,
    habilidades TEXT,
    verification TEXT,
    lastActivityAt TEXT,
    fechaRegistro TEXT
  );
`;

db.exec(createTable);

const insert = db.prepare(`
  INSERT OR IGNORE INTO usuarios (
    id, nombre, email, password, passwordHash, telefono, pais, role, tipo, status,
    emailVerifiedAt, createdAt, updatedAt, descripcion, direccion, horario, precio,
    foto, trabajos, favoritos, habilidades, verification, lastActivityAt, fechaRegistro
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let insertedCount = 0;
for (const user of users) {
  if (!user || !user.email) continue;
  const email = String(user.email).trim().toLowerCase();
  const alreadyExists = db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email);
  if (alreadyExists) continue;

  insert.run(
    user.id || null,
    user.nombre || '',
    email,
    user.password || null,
    user.passwordHash || null,
    user.telefono || '',
    user.pais || '',
    user.role || user.tipo || 'cliente',
    user.tipo || user.role || 'cliente',
    user.status || 'activo',
    user.emailVerifiedAt || null,
    user.createdAt || user.fechaRegistro || new Date().toISOString(),
    user.updatedAt || user.createdAt || user.fechaRegistro || new Date().toISOString(),
    user.descripcion || '',
    user.direccion || '',
    user.horario || '',
    user.precio || '',
    user.foto || '',
    JSON.stringify(Array.isArray(user.trabajos) ? user.trabajos : []),
    JSON.stringify(Array.isArray(user.favoritos) ? user.favoritos : []),
    JSON.stringify(Array.isArray(user.habilidades) ? user.habilidades : []),
    JSON.stringify(user.verification || null),
    user.lastActivityAt || user.updatedAt || user.createdAt || user.fechaRegistro || new Date().toISOString(),
    user.fechaRegistro || user.createdAt || new Date().toISOString()
  );
  insertedCount += 1;
}

console.log('Migración completada. Usuarios insertados:', insertedCount);
console.log('Base SQLite creada:', dbPath);

db.close();
