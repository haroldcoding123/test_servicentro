const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// === TU CARPETA DE BASE DE DATOS ===
const DB_DIR = '/home/harold/Documents/proyecto Superservicihos/USERS.BD';
const DB_FILE = path.join(DB_DIR, 'users.json');

// Crear carpeta/archivo si no existen
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('📁 Carpeta creada:', DB_DIR);
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
    console.log('📄 Archivo users.json creado');
}

function getUsers() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch { return []; }
}
function saveUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// POST /api/register
app.post('/api/register', (req, res) => {
    const { nombre, email, password, telefono, pais, tipo, fechaRegistro, id } = req.body;
    if (!nombre || !email || !password || !pais) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    const newUser = { id, nombre, email, password, telefono: telefono||'', pais, tipo: tipo||'cliente', fechaRegistro };
    users.push(newUser);
    saveUsers(users);
    console.log('✅ Usuario guardado:', email);
    res.status(201).json({ message: 'Usuario registrado', user: { id, nombre, email } });
});

// GET /api/users  (lista sin contraseñas)
app.get('/api/users', (req, res) => {
    const users = getUsers().map(u => ({ id: u.id, nombre: u.nombre, email: u.email, pais: u.pais, tipo: u.tipo, fechaRegistro: u.fechaRegistro }));
    res.json(users);
});

// GET /api/db  (ver el archivo JSON completo)
app.get('/api/db', (req, res) => {
    res.sendFile(DB_FILE);
});

app.listen(PORT, () => {
    console.log('🚀 Servidor en http://localhost:' + PORT);
    console.log('📂 Base de datos:', DB_FILE);
});
