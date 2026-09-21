const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const usersFile = path.join(__dirname, 'users.json');
const adminFile = path.join(__dirname, 'admin.json');
const NEW_PASSWORD = 'NexumAdmin2026!';
const HASH_ROUNDS = 10;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (['admin', 'superadmin', 'super-admin'].includes(role)) return 'admin';
  if (['proveedor', 'tecnico', 'technician'].includes(role)) return 'tecnico';
  return 'cliente';
}

const users = readJson(usersFile);
const adminUser = users.find((user) => normalizeRole(user.role || user.tipo) === 'admin') || null;
const now = new Date().toISOString();

const updatedAdmin = adminUser
  ? {
      ...adminUser,
      email: adminUser.email || 'admin@nexumservice.com',
      nombre: adminUser.nombre || 'Administrador',
      role: 'admin',
      tipo: 'admin',
      status: 'activo',
      updatedAt: now,
      passwordHash: bcrypt.hashSync(NEW_PASSWORD, HASH_ROUNDS),
      password: undefined,
      verification: null
    }
  : {
      id: 'admin_001',
      nombre: 'Administrador',
      email: 'admin@nexumservice.com',
      passwordHash: bcrypt.hashSync(NEW_PASSWORD, HASH_ROUNDS),
      telefono: '+504 0000-0000',
      pais: 'Honduras',
      role: 'admin',
      tipo: 'admin',
      status: 'activo',
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
      descripcion: 'Super administrador del sistema',
      direccion: 'Nexumservice',
      horario: '24/7',
      precio: '',
      foto: '',
      trabajos: [],
      favoritos: [],
      habilidades: [],
      verification: null
    };

const updatedUsers = adminUser ? users.map((user) => normalizeRole(user.role || user.tipo) === 'admin' ? updatedAdmin : user) : [...users, updatedAdmin];
writeJson(usersFile, updatedUsers);

const legacyAdmin = readJson(adminFile);
writeJson(adminFile, { ...legacyAdmin, user: 'admin', pass: NEW_PASSWORD, email: 'admin@nexumservice.com' });

console.log('Admin user in users.json updated successfully.');
console.log('Email:', updatedAdmin.email);
console.log('New password:', NEW_PASSWORD);
console.log('bcrypt rounds:', HASH_ROUNDS);
console.log('Hash:', updatedAdmin.passwordHash);
