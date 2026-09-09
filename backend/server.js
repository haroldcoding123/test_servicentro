require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const { OFICIOS, normalizarTexto } = require('./utils/serviciosSinonimos');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === RUTAS ===
const DB_DIR = __dirname;
const DB_FILE = path.join(DB_DIR, 'users.json');
const ADMIN_FILE = path.join(DB_DIR, 'admin.json');
const UPLOADS_DIR = path.join(DB_DIR, 'uploads');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const VERIFICATION_TTL_MINUTES = Number(process.env.VERIFICATION_TTL_MINUTES || 10);
const RESEND_COOLDOWN_SECONDS = Number(process.env.RESEND_COOLDOWN_SECONDS || 60);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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

function normalizeRole(role) {
    const value = (role || '').toString().trim().toLowerCase();
    if (value === 'proveedor' || value === 'tecnico' || value === 'technician') return 'tecnico';
    return 'cliente';
}

function buildSafeUser(user) {
    if (!user) return null;
    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    delete safe.verification;
    return safe;
}

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function createJwt(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role || normalizeRole(user.tipo),
            tipo: user.tipo || normalizeRole(user.role),
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
        auth: { user, pass }
    });
}

async function sendVerificationEmail(email, code) {
    const transporter = createTransporter();
    const from = process.env.EMAIL_FROM || 'Nexumservice <noreply@example.com>';

    if (!transporter) {
        console.warn('⚠️ SMTP no configurado. Código de verificación no se envió por correo.');
        return false;
    }

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: 'Código de verificación - Nexumservice',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 16px;">
                    <h2 style="margin-bottom: 12px; color: #60a5fa;">Verifica tu cuenta</h2>
                    <p>Tu código de verificación es:</p>
                    <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 18px; margin: 18px 0; text-align: center; color: #fff;">${code}</div>
                    <p>Este código expira en ${VERIFICATION_TTL_MINUTES} minutos.</p>
                    <p>Si no solicitaste esta verificación, puedes ignorar este correo.</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo:', error.message);
        return false;
    }
}

async function issueVerificationCode(userId) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const now = Date.now();
    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(now + VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString();
    const lastSentAt = new Date(now).toISOString();

    user.verification = {
        codeHash,
        expiresAt,
        usedAt: null,
        lastSentAt,
        attempts: 0,
        createdAt: new Date(now).toISOString()
    };
    user.status = 'pendiente_verificacion';

    saveUsers(users);

    const emailed = await sendVerificationEmail(user.email, code);

    return {
        emailed,
        expiresAt,
        lastSentAt,
        devCode: process.env.NODE_ENV !== 'production' ? code : undefined
    };
}

async function loginUserByCredentials(email, password) {
    const users = getUsers();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail);

    if (!user) return { ok: false, message: 'Correo o contraseña incorrectos' };

    const currentHash = user.passwordHash || user.password;
    if (!currentHash) return { ok: false, message: 'Correo o contraseña incorrectos' };

    const passwordMatches = formatPasswordHash(currentHash, password, user);
    if (!passwordMatches) return { ok: false, message: 'Correo o contraseña incorrectos' };

    if ((user.status || 'activo') !== 'activo') {
        return { ok: false, message: 'Tu cuenta aún no ha sido verificada.' };
    }

    const token = createJwt(user);
    return {
        ok: true,
        token,
        user: buildSafeUser(user)
    };
}

function formatPasswordHash(currentHash, password, user) {
    if (user.passwordHash) {
        return bcrypt.compareSync(password, user.passwordHash);
    }
    return currentHash === password;
}

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Token requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

function skillMatchesQuery(skillValue, query) {
    if (!skillValue || !query) return false;

    const skillText = normalizarTexto(skillValue);
    const searchText = normalizarTexto(query);

    if (!skillText || !searchText) return false;
    if (skillText.includes(searchText) || searchText.includes(skillText)) return true;

    const aliasList = Object.values(OFICIOS).flat();
    return aliasList.some(alias => {
        const aliasText = normalizarTexto(alias);
        return aliasText && (aliasText.includes(searchText) || searchText.includes(aliasText) || aliasText === skillText);
    });
}

function tecnicoCoincideConBusqueda(tecnico, query) {
    const normalizedQuery = normalizarTexto(query);
    if (!normalizedQuery) return true;

    const habilidades = Array.isArray(tecnico.habilidades) ? tecnico.habilidades : [];
    const matchesSkill = habilidades.some(skill => skillMatchesQuery(skill, normalizedQuery));
    const hayDescripcion = normalizarTexto(tecnico.descripcion || '').includes(normalizedQuery);
    const hayNombre = normalizarTexto(tecnico.nombre || '').includes(normalizedQuery);
    const hayPais = normalizarTexto(tecnico.pais || '').includes(normalizedQuery);

    return matchesSkill || hayDescripcion || hayNombre || hayPais;
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
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ---------- REGISTRO PUBLICO CON VERIFICACIÓN ----------
app.post('/api/register', async (req, res) => {
    const {
        nombre,
        email,
        password,
        confirmPassword,
        telefono,
        pais,
        tipo,
        role,
        habilidades,
        fechaRegistro,
        id
    } = req.body;

    if (!nombre || !email || !password || !telefono || !pais) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ message: 'El correo electrónico no tiene un formato válido.' });
    }

    if (String(password).length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    if (confirmPassword !== undefined && String(password) !== String(confirmPassword)) {
        return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
    }

    const normalizedRole = normalizeRole(role || tipo || 'cliente');
    const users = getUsers();

    if (users.some(u => String(u.email || '').trim().toLowerCase() === normalizedEmail)) {
        return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const now = new Date().toISOString();
    const userId = id || `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const newUser = {
        id: userId,
        nombre: String(nombre).trim(),
        email: normalizedEmail,
        passwordHash,
        telefono: String(telefono).trim(),
        pais: String(pais).trim(),
        role: normalizedRole,
        tipo: normalizedRole,
        status: 'activo',
        emailVerifiedAt: now,
        createdAt: fechaRegistro || now,
        updatedAt: now,
        descripcion: String(req.body.descripcion || '').trim(),
        direccion: String(req.body.direccion || '').trim(),
        horario: String(req.body.horario || '').trim(),
        precio: String(req.body.precio || '').trim(),
        foto: '',
        trabajos: [],
        favoritos: [],
        habilidades: Array.isArray(habilidades) ? habilidades.map(h => String(h).trim()).filter(Boolean) : [],
        verification: null
    };

    users.push(newUser);
    saveUsers(users);

    const token = createJwt(newUser);
    const safeUser = buildSafeUser(newUser);

    res.status(201).json({
        ok: true,
        message: 'Registro exitoso. Tu cuenta quedó activa.',
        token,
        user: safeUser
    });
});

// ---------- ENVIAR / REENVIAR CÓDIGO ----------
app.post('/api/auth/resend-code', async (req, res) => {
    const { userId, email } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === userId || (u.email || '').toLowerCase() === String(email || '').trim().toLowerCase());

    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const lastSentAt = user.verification?.lastSentAt ? new Date(user.verification.lastSentAt).getTime() : 0;
    const now = Date.now();
    const cooldown = RESEND_COOLDOWN_SECONDS * 1000;

    if (now - lastSentAt < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastSentAt)) / 1000);
        return res.status(429).json({ message: `Debes esperar ${remaining} segundos antes de reenviar el código.` });
    }

    const verification = await issueVerificationCode(user.id);

    return res.json({
        ok: true,
        message: 'Se ha reenviado el código de verificación.',
        devCode: verification?.devCode || undefined
    });
});

// ---------- VERIFICACIÓN DE CÓDIGO ----------
app.post('/api/verify-code', async (req, res) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ message: 'Faltan datos para verificar la cuenta.' });
    }

    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.verification || !user.verification.codeHash) {
        return res.status(400).json({ message: 'No hay un código de verificación activo.' });
    }

    const expiresAt = new Date(user.verification.expiresAt).getTime();
    if (Date.now() > expiresAt) {
        user.status = 'pendiente_verificacion';
        user.verification = null;
        saveUsers(users);
        return res.status(410).json({ message: 'El código ha expirado. Solicita uno nuevo.' });
    }

    const isValid = await bcrypt.compare(String(code), user.verification.codeHash);
    if (!isValid) {
        user.verification.attempts = (user.verification.attempts || 0) + 1;
        saveUsers(users);
        return res.status(401).json({ message: 'Código incorrecto.' });
    }

    user.status = 'activo';
    user.emailVerifiedAt = new Date().toISOString();
    user.verification.usedAt = new Date().toISOString();
    user.verification = null;
    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    const token = createJwt(user);

    return res.json({
        ok: true,
        message: 'Cuenta verificada correctamente.',
        token,
        user: buildSafeUser(user)
    });
});

// ---------- LOGIN REAL ----------
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan credenciales' });

    const result = await loginUserByCredentials(email, password);
    if (!result.ok) {
        return res.status(401).json(result);
    }

    res.json({
        ok: true,
        token: result.token,
        user: {
            id: result.user.id,
            nombre: result.user.nombre,
            email: result.user.email,
            tipo: result.user.tipo || result.user.role,
            role: result.user.role || result.user.tipo,
            pais: result.user.pais,
            telefono: result.user.telefono,
            foto: result.user.foto,
            status: result.user.status,
            habilidades: Array.isArray(result.user.habilidades) ? result.user.habilidades : []
        }
    });
});

app.get('/api/me', requireAuth, (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.user.sub);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ ok: true, user: buildSafeUser(user) });
});

// ---------- PERFIL ----------
app.get('/api/profile/:id', (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(buildSafeUser(user));
});

app.put('/api/profile/:id', (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    const allowed = ['nombre', 'email', 'telefono', 'pais', 'descripcion', 'direccion', 'horario', 'precio', 'habilidades'];
    allowed.forEach(key => {
        if (req.body[key] !== undefined) {
            if (key === 'habilidades') {
                users[idx][key] = Array.isArray(req.body[key]) ? req.body[key].map(h => String(h).trim()).filter(Boolean) : [];
            } else {
                users[idx][key] = req.body[key];
            }
        }
    });
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ message: 'Perfil actualizado', user: buildSafeUser(users[idx]) });
});

// ---------- FOTO DE PERFIL ----------
app.post('/api/profile/:id/photo', upload.single('foto'), (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!req.file) return res.status(400).json({ message: 'No se subió ninguna foto' });
    if (users[idx].foto) {
        const oldPath = path.join(__dirname, users[idx].foto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const relativePath = '/uploads/' + req.params.id + '/' + req.file.filename;
    users[idx].foto = relativePath;
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ message: 'Foto actualizada', foto: relativePath });
});

// ---------- TRABAJOS (fotos de trabajos del técnico) ----------
app.post('/api/profile/:id/trabajos', upload.array('fotos', 10), (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });

    const uploadedFiles = Array.isArray(req.files) && req.files.length ? req.files : (req.file ? [req.file] : []);
    if (!uploadedFiles.length) return res.status(400).json({ message: 'No se subió ninguna foto' });

    const nuevosTrabajos = uploadedFiles.map((file) => ({
        workId: 'work_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8),
        titulo: req.body.titulo || 'Trabajo',
        descripcion: req.body.descripcion || '',
        foto: '/uploads/' + req.params.id + '/' + file.filename,
        fecha: new Date().toISOString()
    }));

    users[idx].trabajos = Array.isArray(users[idx].trabajos) ? [...users[idx].trabajos, ...nuevosTrabajos] : nuevosTrabajos;
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ message: 'Trabajo(s) agregado(s)', trabajos: nuevosTrabajos });
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
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ message: 'Trabajo eliminado' });
});

// ---------- FAVORITOS ----------
app.post('/api/profile/:id/favoritos', (req, res) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { tecnicoId, action } = req.body;
    if (!tecnicoId) return res.status(400).json({ message: 'Falta tecnicoId' });
    const favs = users[idx].favoritos || [];
    if (action === 'add') {
        if (!favs.includes(tecnicoId)) favs.push(tecnicoId);
    } else if (action === 'remove') {
        users[idx].favoritos = favs.filter(f => f !== tecnicoId);
    } else {
        if (favs.includes(tecnicoId)) {
            users[idx].favoritos = favs.filter(f => f !== tecnicoId);
        } else {
            favs.push(tecnicoId);
        }
    }
    if (action === 'add') users[idx].favoritos = favs;
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ message: 'Favoritos actualizados', favoritos: users[idx].favoritos });
});

// ---------- TÉCNICOS PÚBLICOS ----------
app.get('/api/tecnicos/publicos', (req, res) => {
    const users = getUsers().filter(u => normalizeRole(u.role || u.tipo) === 'tecnico' && (u.status || 'activo') === 'activo');
    const { categoria, q } = req.query;
    let result = users;
    if (categoria) {
        result = result.filter(u => {
            const desc = (u.descripcion || '').toLowerCase();
            const nombre = (u.nombre || '').toLowerCase();
            const habilidades = Array.isArray(u.habilidades) ? u.habilidades.join(' ').toLowerCase() : '';
            return desc.includes(categoria.toLowerCase()) || nombre.includes(categoria.toLowerCase()) || habilidades.includes(categoria.toLowerCase());
        });
    }
    if (q) {
        const query = String(q).trim();
        result = result.filter(u => tecnicoCoincideConBusqueda(u, query));
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
        habilidades: Array.isArray(u.habilidades) ? u.habilidades : [],
        fechaRegistro: u.createdAt || u.fechaRegistro
    }));
    res.json(safe);
});

app.get('/api/tecnicos/buscar', (req, res) => {
    const query = String(req.query.query || '').trim();
    const pais = String(req.query.pais || '').trim();

    const users = getUsers().filter(u => normalizeRole(u.role || u.tipo) === 'tecnico' && (u.status || 'activo') === 'activo');

    let result = users.filter(u => !query || tecnicoCoincideConBusqueda(u, query));
    if (pais) {
        result = result.filter(u => (u.pais || '').toLowerCase() === pais.toLowerCase());
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
        habilidades: Array.isArray(u.habilidades) ? u.habilidades : [],
        fechaRegistro: u.createdAt || u.fechaRegistro
    }));

    res.json({ ok: true, query, results: safe });
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
    res.json(getUsers().map(buildSafeUser));
});

app.get('/api/admin/tecnicos', (req, res) => {
    res.json(getUsers().filter(u => normalizeRole(u.role || u.tipo) === 'tecnico').map(buildSafeUser));
});

app.get('/api/admin/stats', (req, res) => {
    const users = getUsers();
    const porPais = {};
    users.forEach(u => { porPais[u.pais] = (porPais[u.pais] || 0) + 1; });
    res.json({
        totalUsuarios: users.length,
        totalClientes: users.filter(u => normalizeRole(u.role || u.tipo) === 'cliente').length,
        totalTecnicos: users.filter(u => normalizeRole(u.role || u.tipo) === 'tecnico').length,
        paises: Object.keys(porPais).length,
        porPais,
        porTipo: {
            clientes: users.filter(u => normalizeRole(u.role || u.tipo) === 'cliente').length,
            tecnicos: users.filter(u => normalizeRole(u.role || u.tipo) === 'tecnico').length
        }
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    let users = getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

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
    const { nombre, email, telefono, pais, tipo, role, status } = req.body;
    if (nombre) users[idx].nombre = nombre;
    if (email) users[idx].email = email;
    if (telefono !== undefined) users[idx].telefono = telefono;
    if (pais) users[idx].pais = pais;
    if (tipo || role) {
        const nextRole = normalizeRole(role || tipo);
        users[idx].role = nextRole;
        users[idx].tipo = nextRole;
    }
    if (status) users[idx].status = status;
    users[idx].updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ message: 'Usuario actualizado', user: buildSafeUser(users[idx]) });
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
    console.log('📧 SMTP configurado:', Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
});
