const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === RUTAS ===
const DB_DIR = '/home/harold/Documents/proyecto Superservicihos/USERS.BD';
const DB_FILE = path.join(DB_DIR, 'users.json');
const ADMIN_FILE = path.join(DB_DIR, 'admin.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(ADMIN_FILE)) fs.writeFileSync(ADMIN_FILE, JSON.stringify({ user: 'admin', pass: 'admin123' }, null, 2));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function getUsers() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch { return []; }
}
function saveUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}
function getAdmin() {
    try { return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')); }
    catch { return { user: 'admin', pass: 'admin123' }; }
}
function saveAdmin(data) {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(data, null, 2));
}

// ---------- MULTER CONFIG ----------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(UPLOADS_DIR, req.params.id);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// ---------- REGISTRO PUBLICO ----------
app.post('/api/register', (req, res) => {
    const { nombre, email, password, telefono, pais, tipo, fechaRegistro, id } = req.body;
    if (!nombre || !email || !password || !pais) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    const newUser = {
        id, nombre, email, password,
        telefono: telefono || '',
        pais,
        tipo: tipo || 'cliente',
        fechaRegistro,
        // Campos nuevos
        descripcion: '',
        direccion: '',
        horario: '',
        precio: '',
        foto: '',
        trabajos: [],
        favoritos: []
    };
    users.push(newUser);
    saveUsers(users);
    console.log('✅ Usuario guardado:', email);
    res.status(201).json({ message: 'Usuario registrado', user: { id, nombre, email, tipo: newUser.tipo } });
});

// ---------- LOGIN REAL ----------
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan credenciales' });
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    res.json({
        ok: true,
        user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            tipo: user.tipo,
            pais: user.pais,
            telefono: user.telefono,
            foto: user.foto
        }
    });
});

// ---------- PERFIL ----------
app.get('/api/profile/:id', (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { password, ...safe } = user;
    res.json(safe);
});

app.put('/api/profile/:id', (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    const allowed = ['nombre', 'email', 'telefono', 'pais', 'descripcion', 'direccion', 'horario', 'precio'];
    allowed.forEach(key => {
        if (req.body[key] !== undefined) users[idx][key] = req.body[key];
    });
    saveUsers(users);
    const { password, ...safe } = users[idx];
    res.json({ message: 'Perfil actualizado', user: safe });
});

// ---------- FOTO DE PERFIL ----------
app.post('/api/profile/:id/photo', upload.single('foto'), (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!req.file) return res.status(400).json({ message: 'No se subió ninguna foto' });
    // Borrar foto anterior si existe
    if (users[idx].foto) {
        const oldPath = path.join(__dirname, users[idx].foto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const relativePath = '/uploads/' + req.params.id + '/' + req.file.filename;
    users[idx].foto = relativePath;
    saveUsers(users);
    res.json({ message: 'Foto actualizada', foto: relativePath });
});

// ---------- TRABAJOS (fotos de trabajos del técnico) ----------
app.post('/api/profile/:id/trabajos', upload.single('foto'), (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!req.file) return res.status(400).json({ message: 'No se subió ninguna foto' });
    const trabajo = {
        workId: 'work_' + Date.now(),
        titulo: req.body.titulo || 'Trabajo',
        descripcion: req.body.descripcion || '',
        foto: '/uploads/' + req.params.id + '/' + req.file.filename,
        fecha: new Date().toISOString()
    };
    users[idx].trabajos.push(trabajo);
    saveUsers(users);
    res.json({ message: 'Trabajo agregado', trabajo });
});

app.delete('/api/profile/:id/trabajos/:workId', (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    const trabajo = users[idx].trabajos.find(t => t.workId === req.params.workId);
    if (trabajo && trabajo.foto) {
        const filePath = path.join(__dirname, trabajo.foto);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    users[idx].trabajos = users[idx].trabajos.filter(t => t.workId !== req.params.workId);
    saveUsers(users);
    res.json({ message: 'Trabajo eliminado' });
});

// ---------- FAVORITOS ----------
app.post('/api/profile/:id/favoritos', (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { tecnicoId, action } = req.body; // action: 'add' o 'remove'
    if (!tecnicoId) return res.status(400).json({ message: 'Falta tecnicoId' });
    const favs = users[idx].favoritos || [];
    if (action === 'add') {
        if (!favs.includes(tecnicoId)) favs.push(tecnicoId);
    } else if (action === 'remove') {
        users[idx].favoritos = favs.filter(f => f !== tecnicoId);
    } else {
        // Toggle
        if (favs.includes(tecnicoId)) {
            users[idx].favoritos = favs.filter(f => f !== tecnicoId);
        } else {
            favs.push(tecnicoId);
        }
    }
    if (action === 'add') users[idx].favoritos = favs;
    saveUsers(users);
    res.json({ message: 'Favoritos actualizados', favoritos: users[idx].favoritos });
});

// ---------- TÉCNICOS PÚBLICOS ----------
app.get('/api/tecnicos/publicos', (req, res) => {
    const users = getUsers().filter(u => u.tipo === 'proveedor');
    const { categoria, q } = req.query;
    let result = users;
    if (categoria) {
        result = result.filter(u => {
            const desc = (u.descripcion || '').toLowerCase();
            const nombre = (u.nombre || '').toLowerCase();
            return desc.includes(categoria.toLowerCase()) || nombre.includes(categoria.toLowerCase());
        });
    }
    if (q) {
        const query = q.toLowerCase();
        result = result.filter(u =>
            (u.nombre || '').toLowerCase().includes(query) ||
            (u.descripcion || '').toLowerCase().includes(query) ||
            (u.direccion || '').toLowerCase().includes(query)
        );
    }
    const safe = result.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        pais: u.pais,
        descripcion: u.descripcion,
        direccion: u.direccion,
        horario: u.horario,
        precio: u.precio,
        foto: u.foto,
        trabajos: u.trabajos,
        fechaRegistro: u.fechaRegistro
    }));
    res.json(safe);
});

// ---------- ADMIN ENDPOINTS ----------
app.post('/api/admin/login', (req, res) => {
    const { user, pass } = req.body;
    const admin = getAdmin();
    if (user === admin.user && pass === admin.pass) {
        res.json({ ok: true, token: 'admintoken2026' });
    } else {
        res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
    }
});

app.get('/api/admin/users', (req, res) => {
    res.json(getUsers());
});

app.get('/api/admin/tecnicos', (req, res) => {
    res.json(getUsers().filter(u => u.tipo === 'proveedor'));
});

app.get('/api/admin/stats', (req, res) => {
    const users = getUsers();
    const porPais = {};
    users.forEach(u => { porPais[u.pais] = (porPais[u.pais] || 0) + 1; });
    res.json({
        totalUsuarios: users.length,
        totalClientes: users.filter(u => u.tipo === 'cliente').length,
        totalTecnicos: users.filter(u => u.tipo === 'proveedor').length,
        paises: Object.keys(porPais).length,
        porPais,
        porTipo: {
            clientes: users.filter(u => u.tipo === 'cliente').length,
            tecnicos: users.filter(u => u.tipo === 'proveedor').length
        }
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    let users = getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Borrar carpeta de uploads del usuario (fotos huérfanas)
    const userUploadDir = path.join(UPLOADS_DIR, req.params.id);
    if (fs.existsSync(userUploadDir)) {
        fs.rmSync(userUploadDir, { recursive: true, force: true });
        console.log('🗑️ Fotos borradas:', userUploadDir);
    }

    users = users.filter(u => u.id !== req.params.id);
    saveUsers(users);
    res.json({ message: 'Usuario eliminado' });
});

app.put('/api/admin/users/:id', (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { nombre, email, telefono, pais, tipo } = req.body;
    if (nombre) users[idx].nombre = nombre;
    if (email) users[idx].email = email;
    if (telefono !== undefined) users[idx].telefono = telefono;
    if (pais) users[idx].pais = pais;
    if (tipo) users[idx].tipo = tipo;
    saveUsers(users);
    res.json({ message: 'Usuario actualizado', user: users[idx] });
});

app.post('/api/admin/password', (req, res) => {
    const { currentPass, newPass } = req.body;
    const admin = getAdmin();
    if (currentPass !== admin.pass) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    }
    admin.pass = newPass;
    saveAdmin(admin);
    res.json({ message: 'Contraseña actualizada' });
});

app.get('/api/db', (req, res) => {
    res.sendFile(DB_FILE);
});

app.listen(PORT, () => {
    console.log('🚀 Servidor en http://localhost:' + PORT);
    console.log('📂 Base de datos: ' + DB_FILE);
    console.log('📷 Uploads: ' + UPLOADS_DIR);
    console.log('🔐 Panel admin: http://localhost:' + PORT + '/admin.html');
});
