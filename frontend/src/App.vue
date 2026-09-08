<script setup>
import { computed, onMounted, ref } from 'vue'

const API = 'http://localhost:3000/api'
const currentView = ref('register')
const form = ref({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  telefono: '',
  pais: '',
  role: 'cliente',
  descripcion: '',
  direccion: '',
  horario: '',
  precio: ''
})
const verificationCode = ref('')
const notification = ref({ type: 'info', text: '' })
const pendingUser = ref(null)
const token = ref(localStorage.getItem('servilocal_token') || '')
const user = ref(JSON.parse(localStorage.getItem('servilocal_user') || 'null'))
const isSubmitting = ref(false)
const resendCooldown = ref(0)
let countdownTimer = null

const isLoggedIn = computed(() => Boolean(token.value && user.value))
const currentRole = computed(() => (user.value?.role || user.value?.tipo || 'cliente'))

const menuOptions = computed(() => {
  if (currentRole.value === 'tecnico') {
    return [
      { label: 'Mi perfil', icon: '👤' },
      { label: 'Mis servicios', icon: '🛠️' },
      { label: 'Solicitudes', icon: '📩' },
      { label: 'Estadísticas', icon: '📊' }
    ]
  }

  return [
    { label: 'Buscar técnicos', icon: '🔍' },
    { label: 'Mis solicitudes', icon: '📋' },
    { label: 'Mi perfil', icon: '👤' },
    { label: 'Favoritos', icon: '⭐' }
  ]
})

function setNotice(type, text) {
  notification.value = { type, text }
}

function persistSession(nextToken, nextUser) {
  token.value = nextToken
  user.value = nextUser
  localStorage.setItem('servilocal_token', nextToken || '')
  localStorage.setItem('servilocal_user', JSON.stringify(nextUser || null))
}

function logout() {
  token.value = ''
  user.value = null
  pendingUser.value = null
  verificationCode.value = ''
  localStorage.removeItem('servilocal_token')
  localStorage.removeItem('servilocal_user')
  currentView.value = 'register'
  setNotice('success', 'Sesión cerrada correctamente.')
}

function normalizeRole(value) {
  return value === 'tecnico' || value === 'proveedor' ? 'tecnico' : 'cliente'
}

function startCooldown(seconds = 60) {
  resendCooldown.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)

  countdownTimer = setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1)
    if (resendCooldown.value === 0) clearInterval(countdownTimer)
  }, 1000)
}

async function registerUser() {
  if (!form.value.nombre || !form.value.email || !form.value.password || !form.value.pais) {
    setNotice('error', 'Completa nombre, correo, contraseña y país.')
    return
  }

  if (form.value.password.length < 6) {
    setNotice('error', 'La contraseña debe tener al menos 6 caracteres.')
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    setNotice('error', 'Las contraseñas no coinciden.')
    return
  }

  isSubmitting.value = true
  setNotice('info', 'Creando tu cuenta y enviando el código de verificación...')

  try {
    const payload = {
      ...form.value,
      role: normalizeRole(form.value.role),
      tipo: normalizeRole(form.value.role),
      descripcion: form.value.descripcion,
      direccion: form.value.direccion,
      horario: form.value.horario,
      precio: form.value.precio,
      fechaRegistro: new Date().toISOString()
    }

    const response = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'No se pudo completar el registro.')
    }

    pendingUser.value = data.user
    currentView.value = 'verify'
    verificationCode.value = ''
    setNotice('success', data.message || 'Código enviado.')
    startCooldown(60)
  } catch (error) {
    setNotice('error', error.message)
  } finally {
    isSubmitting.value = false
  }
}

async function verifyCode() {
  if (!pendingUser.value?.id || !verificationCode.value.trim()) {
    setNotice('error', 'Ingresa el código de 6 dígitos.')
    return
  }

  isSubmitting.value = true
  setNotice('info', 'Verificando tu cuenta...')

  try {
    const response = await fetch(`${API}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: pendingUser.value.id,
        code: verificationCode.value.trim()
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Código incorrecto.')
    }

    persistSession(data.token, data.user)
    currentView.value = currentRole.value === 'tecnico' ? 'dashboard-tecnico' : 'dashboard-cliente'
    setNotice('success', 'Cuenta verificada correctamente.')
  } catch (error) {
    setNotice('error', error.message)
  } finally {
    isSubmitting.value = false
  }
}

async function resendCode() {
  if (!pendingUser.value?.id) return
  if (resendCooldown.value > 0) {
    setNotice('error', `Espera ${resendCooldown.value}s antes de reenviar el código.`)
    return
  }

  try {
    const response = await fetch(`${API}/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pendingUser.value.id })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'No se pudo reenviar el código.')

    setNotice('success', data.message || 'Código reenviado.')
    startCooldown(60)
  } catch (error) {
    setNotice('error', error.message)
  }
}

onMounted(() => {
  if (token.value && user.value) {
    currentView.value = currentRole.value === 'tecnico' ? 'dashboard-tecnico' : 'dashboard-cliente'
  } else {
    currentView.value = 'register'
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div class="text-xl font-black text-blue-400">Nexumservice</div>

        <div v-if="isLoggedIn" class="flex items-center gap-2">
          <span class="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase text-blue-300">
            {{ currentRole }}
          </span>

          <div class="flex gap-2 rounded-xl border border-slate-700 bg-slate-900 p-1">
            <button
              v-for="option in menuOptions"
              :key="option.label"
              class="rounded-lg px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
            >
              <span class="mr-1">{{ option.icon }}</span>{{ option.label }}
            </button>
          </div>

          <button @click="logout" class="rounded-lg border border-red-700/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20">
            Salir
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-10">
      <div v-if="notification.text" class="mb-5 rounded-xl border px-4 py-3 text-sm" :class="{
          'border-blue-500/50 bg-blue-500/10 text-blue-200': notification.type === 'info',
          'border-green-500/50 bg-green-500/10 text-green-200': notification.type === 'success',
          'border-red-500/50 bg-red-500/10 text-red-200': notification.type === 'error'
        }">
        {{ notification.text }}
      </div>

      <section v-if="currentView === 'register'" class="grid gap-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 md:grid-cols-2">
        <div class="flex flex-col justify-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Registro seguro</p>
          <h1 class="text-4xl font-black text-white">Únete a Nexumservice</h1>
          <p class="mt-4 text-slate-300">
            Crea tu cuenta como cliente o como técnico y recibe un código de verificación por correo electrónico antes de activar tu acceso.
          </p>
          <div class="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p class="font-semibold text-white">Requisito de seguridad</p>
            <p class="mt-2">Tu contraseña se guarda en hash y tu acceso solo se activa después de verificar el correo.</p>
          </div>
        </div>

        <form @submit.prevent="registerUser" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block text-sm text-slate-300 sm:col-span-2">
              <span class="mb-1 block">Nombre completo</span>
              <input v-model="form.nombre" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Juan Pérez" />
            </label>

            <label class="block text-sm text-slate-300 sm:col-span-2">
              <span class="mb-1 block">Correo electrónico</span>
              <input v-model="form.email" type="email" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="tu@email.com" />
            </label>

            <label class="block text-sm text-slate-300">
              <span class="mb-1 block">Contraseña</span>
              <input v-model="form.password" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Mínimo 6 caracteres" />
            </label>

            <label class="block text-sm text-slate-300">
              <span class="mb-1 block">Confirmar contraseña</span>
              <input v-model="form.confirmPassword" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Repite tu contraseña" />
            </label>

            <label class="block text-sm text-slate-300">
              <span class="mb-1 block">Teléfono</span>
              <input v-model="form.telefono" type="tel" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="+56 9 1234 5678" />
            </label>

            <label class="block text-sm text-slate-300">
              <span class="mb-1 block">País</span>
              <select v-model="form.pais" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none">
                <option value="">Selecciona un país</option>
                <option value="cl">Chile</option>
                <option value="mx">México</option>
                <option value="ar">Argentina</option>
                <option value="pe">Perú</option>
                <option value="co">Colombia</option>
                <option value="es">España</option>
              </select>
            </label>

            <div class="sm:col-span-2">
              <p class="mb-2 text-sm text-slate-300">Tipo de perfil</p>
              <div class="grid grid-cols-2 gap-3">
                <label class="cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-3 text-center transition hover:border-blue-500" :class="form.role === 'cliente' ? 'border-blue-500 bg-blue-500/10' : ''">
                  <input v-model="form.role" value="cliente" type="radio" class="sr-only" />
                  <span class="text-lg">👤</span>
                  <p class="mt-2 font-semibold text-white">Cliente</p>
                </label>
                <label class="cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-3 text-center transition hover:border-blue-500" :class="form.role === 'tecnico' ? 'border-blue-500 bg-blue-500/10' : ''">
                  <input v-model="form.role" value="tecnico" type="radio" class="sr-only" />
                  <span class="text-lg">🛠️</span>
                  <p class="mt-2 font-semibold text-white">Técnico</p>
                </label>
              </div>
            </div>

            <label v-if="form.role === 'tecnico'" class="block text-sm text-slate-300 sm:col-span-2">
              <span class="mb-1 block">Descripción de servicios</span>
              <textarea v-model="form.descripcion" rows="3" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Ej. Servicios de fontanería, electricidad y remodelaciones."></textarea>
            </label>

            <label v-if="form.role === 'tecnico'" class="block text-sm text-slate-300">
              <span class="mb-1 block">Dirección</span>
              <input v-model="form.direccion" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Av. Principal 123" />
            </label>

            <label v-if="form.role === 'tecnico'" class="block text-sm text-slate-300">
              <span class="mb-1 block">Horario</span>
              <input v-model="form.horario" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Lun - Sáb 08:00 - 20:00" />
            </label>

            <label v-if="form.role === 'tecnico'" class="block text-sm text-slate-300 sm:col-span-2">
              <span class="mb-1 block">Precio base / tarifa</span>
              <input v-model="form.precio" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="$25.000 CLP / hora" />
            </label>
          </div>

          <button :disabled="isSubmitting" type="submit" class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70">
            {{ isSubmitting ? 'Enviando...' : 'Registrarme y enviar código' }}
          </button>
        </form>
      </section>

      <section v-else-if="currentView === 'verify'" class="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
        <p class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Verificación</p>
        <h2 class="text-3xl font-black text-white">Confirma tu correo</h2>
        <p class="mt-3 text-sm text-slate-300">
          Ingresa el código de 6 dígitos que enviamos a <span class="font-semibold text-white">{{ pendingUser?.email }}</span>.
        </p>

        <form @submit.prevent="verifyCode" class="mt-6 space-y-4">
          <label class="block text-sm text-slate-300">
            <span class="mb-2 block">Código de verificación</span>
            <input v-model="verificationCode" maxlength="6" inputmode="numeric" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-center text-2xl font-bold tracking-[0.5rem] text-white focus:border-blue-500 focus:outline-none" placeholder="123456" />
          </label>

          <button :disabled="isSubmitting" type="submit" class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70">
            {{ isSubmitting ? 'Verificando...' : 'Verificar cuenta' }}
          </button>
        </form>

        <div class="mt-5 flex items-center justify-between gap-3 text-sm">
          <button @click="resendCode" :disabled="resendCooldown > 0" class="font-medium text-blue-300 hover:text-blue-200 disabled:cursor-not-allowed disabled:text-slate-500">
            {{ resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código' }}
          </button>
          <button @click="currentView = 'register'" class="text-slate-400 hover:text-slate-200">Editar datos</button>
        </div>
      </section>

      <section v-else-if="currentView === 'dashboard-cliente'" class="space-y-6">
        <div class="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p class="text-sm uppercase tracking-[0.2em] text-blue-300">Panel cliente</p>
          <h2 class="mt-2 text-3xl font-black text-white">Bienvenido, {{ user?.nombre || 'Cliente' }}</h2>
          <p class="mt-2 text-slate-300">Aquí puedes buscar técnicos, ver solicitudes y mantener tu perfil.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="text-3xl mb-3">🔍</div>
            <h3 class="text-lg font-bold text-white">Buscar técnicos</h3>
            <p class="mt-2 text-sm text-slate-400">Encuentra profesionales cerca de tu ubicación.</p>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="text-3xl mb-3">📋</div>
            <h3 class="text-lg font-bold text-white">Mis solicitudes</h3>
            <p class="mt-2 text-sm text-slate-400">Consulta cotizaciones y contrataciones activas.</p>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="text-3xl mb-3">👤</div>
            <h3 class="text-lg font-bold text-white">Mi perfil</h3>
            <p class="mt-2 text-sm text-slate-400">Actualiza tus datos y preferencias.</p>
          </div>
        </div>
      </section>

      <section v-else-if="currentView === 'dashboard-tecnico'" class="space-y-6">
        <div class="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p class="text-sm uppercase tracking-[0.2em] text-blue-300">Panel técnico</p>
          <h2 class="mt-2 text-3xl font-black text-white">Bienvenido, {{ user?.nombre || 'Técnico' }}</h2>
          <p class="mt-2 text-slate-300">Gestiona tus servicios, solicitudes y perfil profesional.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="text-3xl mb-3">🛠️</div>
            <h3 class="text-lg font-bold text-white">Mis servicios</h3>
            <p class="mt-2 text-sm text-slate-400">Administra tu catálogo, horarios y especialidades.</p>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="text-3xl mb-3">📩</div>
            <h3 class="text-lg font-bold text-white">Solicitudes</h3>
            <p class="mt-2 text-sm text-slate-400">Revisa las solicitudes entrantes y responde rápidamente.</p>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="text-3xl mb-3">📊</div>
            <h3 class="text-lg font-bold text-white">Estadísticas</h3>
            <p class="mt-2 text-sm text-slate-400">Compara pedidos, calidad y actividad reciente.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
