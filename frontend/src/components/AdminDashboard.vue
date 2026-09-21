<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, readSession } from '../session.js'

const router = useRouter()
const session = ref(readSession())
const users = ref([])
const stats = ref({
  totalUsuarios: 0,
  totalClientes: 0,
  totalTecnicos: 0,
  totalAdmins: 0,
  porTipo: { clientes: 0, tecnicos: 0, admins: 0 },
  porEstado: {
    pendiente: 0,
    cotizado: 0,
    aceptado: 0,
    'en progreso': 0,
    completado: 0,
    cancelado: 0
  },
  userTrend: [],
  tecnicosTop: []
})
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const activeRoleFilter = ref('all')
const selectedUser = ref(null)
const changingRoleId = ref(null)
const roleDraft = ref('cliente')
const confirmText = ref('')

const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase()
  return users.value.filter((user) => {
    const matchesRole = activeRoleFilter.value === 'all' || (user.role || user.tipo || 'cliente') === activeRoleFilter.value
    const hayTexto = !query || [user.nombre, user.email, user.pais, user.role, user.status].join(' ').toLowerCase().includes(query)
    return matchesRole && hayTexto
  })
})

function ensureAdminAccess() {
  const currentUser = readSession().user
  const role = (currentUser?.role || currentUser?.tipo || 'cliente').toLowerCase()
  if (!currentUser || role !== 'admin') {
    router.push('/')
  }
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const token = readSession().token
    const [usersResponse, statsResponse] = await Promise.all([
      fetch('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])

    if (!usersResponse.ok || !statsResponse.ok) {
      throw new Error('No se pudo cargar el panel administrativo.')
    }

    const usersData = await usersResponse.json()
    const statsData = await statsResponse.json()
    users.value = usersData
    stats.value = statsData
  } catch (error) {
    errorMessage.value = error.message || 'Error cargando dashboard.'
  } finally {
    loading.value = false
  }
}

function openUser(user) {
  selectedUser.value = user
  roleDraft.value = user.role || user.tipo || 'cliente'
}

function closeUser() {
  selectedUser.value = null
  changingRoleId.value = null
  confirmText.value = ''
}

function changeRole(user) {
  changingRoleId.value = user.id
  roleDraft.value = user.role || user.tipo || 'cliente'
  confirmText.value = ''
}

async function saveRole(user) {
  const nextRole = roleDraft.value
  if (!nextRole || nextRole === (user.role || user.tipo || 'cliente')) {
    changingRoleId.value = null
    return
  }

  if (confirmText.value.trim().toLowerCase() !== 'cambiar rol') {
    errorMessage.value = 'Escribe “cambiar rol” para confirmar.'
    return
  }

  try {
    const token = readSession().token
    const response = await fetch(`http://localhost:3000/api/admin/users/${user.id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role: nextRole })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'No se pudo cambiar el rol.')

    users.value = users.value.map(item => item.id === user.id ? data.user : item)
    selectedUser.value = data.user
    roleDraft.value = data.user.role
    errorMessage.value = ''
    changingRoleId.value = null
    confirmText.value = ''
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo aplicar el cambio.'
  }
}

function logout() {
  clearSession()
  router.push('/')
}

const totalChartBars = computed(() => {
  const values = Object.values(stats.value.porEstado || {})
  const max = Math.max(...values, 1)
  return Object.entries(stats.value.porEstado || {}).map(([key, value]) => ({
    key,
    value,
    width: `${(value / max) * 100}%`
  }))
})

const totalUsersSummary = computed(() => stats.value.totalUsuarios || users.value.length)
let refreshTimer = null

onMounted(() => {
  ensureAdminAccess()
  loadDashboard()
  refreshTimer = setInterval(() => {
    loadDashboard()
  }, 15000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
    <div class="mx-auto max-w-7xl">
      <header class="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/30 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Admin</p>
          <h1 class="mt-2 text-2xl font-black text-white md:text-3xl">Panel de administración</h1>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button @click="loadDashboard" class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Actualizar datos
          </button>
          <button @click="logout" class="rounded-xl border border-red-700/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20">
            Cerrar sesión
          </button>
        </div>
      </header>

      <div v-if="errorMessage" class="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {{ errorMessage }}
      </div>

      <div v-if="loading" class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
        Cargando estadísticas y usuarios...
      </div>

      <div v-else class="space-y-6">
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p class="text-sm text-slate-400">Total usuarios</p>
            <h2 class="mt-3 text-3xl font-black text-white">{{ totalUsersSummary }}</h2>
          </article>
          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p class="text-sm text-slate-400">Clientes</p>
            <h2 class="mt-3 text-3xl font-black text-blue-300">{{ stats.porTipo?.clientes || 0 }}</h2>
          </article>
          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p class="text-sm text-slate-400">Técnicos</p>
            <h2 class="mt-3 text-3xl font-black text-emerald-300">{{ stats.porTipo?.tecnicos || 0 }}</h2>
          </article>
          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p class="text-sm text-slate-400">Admins</p>
            <h2 class="mt-3 text-3xl font-black text-violet-300">{{ stats.porTipo?.admins || 0 }}</h2>
          </article>
        </section>

        <section class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h3 class="text-lg font-bold text-white">Tendencia de registros</h3>
            </div>
            <div class="flex h-48 items-end gap-3">
              <div v-for="item in stats.userTrend || []" :key="item.label" class="flex flex-1 flex-col items-center justify-end gap-2">
                <div class="w-full rounded-t-xl bg-gradient-to-t from-blue-500 to-cyan-400" :style="{ height: `${Math.max((item.value / 25) * 100, 18)}%` }"></div>
                <span class="text-[10px] text-slate-400">{{ item.label }}</span>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 class="mb-4 text-lg font-bold text-white">Solicitudes por estado</h3>
            <div class="space-y-3">
              <div v-for="item in totalChartBars" :key="item.key" class="space-y-1">
                <div class="flex items-center justify-between text-xs text-slate-300">
                  <span class="capitalize">{{ item.key }}</span>
                  <span>{{ stats.porEstado[item.key] || 0 }}</span>
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" :style="{ width: item.width }"></div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section class="grid gap-6 xl:grid-cols-2">
          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 class="mb-4 text-lg font-bold text-white">Técnicos más activos</h3>
            <div class="space-y-3">
              <div v-for="tech in stats.tecnicosTop || []" :key="tech.nombre" class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div>
                  <p class="font-semibold text-white">{{ tech.nombre }}</p>
                  <p class="text-xs text-slate-400">{{ tech.pais }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-emerald-300">⭐ {{ tech.calificacion.toFixed(1) }}</p>
                  <p class="text-xs text-slate-400">{{ tech.actividades }} trabajos</p>
                </div>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 class="mb-4 text-lg font-bold text-white">Acciones rápidas</h3>
            <div class="grid gap-3 sm:grid-cols-2">
              <button class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                Exportar usuarios
              </button>
              <button class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                Revisar pendientes
              </button>
              <button class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                Auditoría de roles
              </button>
              <button class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                Notificaciones
              </button>
            </div>
          </article>
        </section>

        <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div class="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 class="text-xl font-bold text-white">Usuarios registrados</h3>
              <p class="text-sm text-slate-400">Todos los clientes, técnicos y administradores.</p>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input v-model="search" type="search" placeholder="Buscar usuario..." class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none sm:w-64" />
              <select v-model="activeRoleFilter" class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                <option value="all">Todos</option>
                <option value="cliente">Clientes</option>
                <option value="tecnico">Técnicos</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          <div class="overflow-hidden rounded-xl border border-slate-800">
            <div class="hidden grid-cols-[1.5fr_1.6fr_1fr_1fr_1fr] gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:grid">
              <span>Usuario</span>
              <span>Email</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div v-for="user in filteredUsers" :key="user.id" class="border-t border-slate-800 bg-slate-900/50 p-4 md:grid md:grid-cols-[1.5fr_1.6fr_1fr_1fr_1fr] md:items-center md:gap-3 md:p-3">
              <div class="mb-3 md:mb-0">
                <p class="font-semibold text-white">{{ user.nombre || 'Sin nombre' }}</p>
                <p class="text-xs text-slate-400">{{ user.pais || 'Sin país' }}</p>
              </div>

              <div class="mb-3 md:mb-0">
                <p class="text-sm text-slate-200">{{ user.email || 'Sin correo' }}</p>
                <p class="text-[11px] text-slate-500">{{ new Date(user.createdAt || user.fechaRegistro || Date.now()).toLocaleDateString('es-HN') }}</p>
              </div>

              <div class="mb-3 md:mb-0">
                <span class="inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize" :class="{
                  'border-blue-500/40 bg-blue-500/10 text-blue-200': (user.role || user.tipo || 'cliente') === 'cliente',
                  'border-emerald-500/40 bg-emerald-500/10 text-emerald-200': (user.role || user.tipo || 'cliente') === 'tecnico',
                  'border-violet-500/40 bg-violet-500/10 text-violet-200': (user.role || user.tipo || 'cliente') === 'admin'
                }">
                  {{ user.role || user.tipo || 'cliente' }}
                </span>
              </div>

              <div class="mb-3 md:mb-0">
                <span class="inline-flex rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 capitalize">
                  {{ user.status || 'activo' }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button @click="openUser(user)" class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                  Ver
                </button>
                <button @click="changeRole(user)" class="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/20">
                  Rol
                </button>
              </div>
            </div>

            <div v-if="!filteredUsers.length" class="p-8 text-center text-sm text-slate-400">
              No se encontraron usuarios con ese filtro.
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-if="selectedUser" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/40">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Detalle</p>
            <h3 class="mt-2 text-2xl font-black text-white">{{ selectedUser.nombre }}</h3>
          </div>
          <button @click="closeUser" class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">Cerrar</button>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Información básica</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-200">
              <div class="flex justify-between gap-3"><dt>Email</dt><dd>{{ selectedUser.email }}</dd></div>
              <div class="flex justify-between gap-3"><dt>Teléfono</dt><dd>{{ selectedUser.telefono || 'No disponible' }}</dd></div>
              <div class="flex justify-between gap-3"><dt>País</dt><dd>{{ selectedUser.pais || 'No especificado' }}</dd></div>
              <div class="flex justify-between gap-3"><dt>Rol</dt><dd class="capitalize">{{ selectedUser.role || selectedUser.tipo || 'cliente' }}</dd></div>
              <div class="flex justify-between gap-3"><dt>Estado</dt><dd class="capitalize">{{ selectedUser.status || 'activo' }}</dd></div>
            </dl>
          </div>

          <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Metadatos</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-200">
              <div class="flex justify-between gap-3"><dt>Fecha de registro</dt><dd>{{ new Date(selectedUser.createdAt || selectedUser.fechaRegistro || Date.now()).toLocaleString('es-HN') }}</dd></div>
              <div class="flex justify-between gap-3"><dt>Última actividad</dt><dd>{{ new Date(selectedUser.lastActivityAt || selectedUser.updatedAt || selectedUser.createdAt || Date.now()).toLocaleString('es-HN') }}</dd></div>
              <div class="flex justify-between gap-3"><dt>Cuenta</dt><dd>{{ selectedUser.status || 'activo' }}</dd></div>
              <div class="flex justify-between gap-3"><dt>Servicios</dt><dd>{{ Array.isArray(selectedUser.trabajos) ? selectedUser.trabajos.length : 0 }}</dd></div>
            </dl>
          </div>
        </div>

        <div class="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Cambiar rol</p>

          <div v-if="changingRoleId === selectedUser.id" class="mt-4 space-y-3">
            <select v-model="roleDraft" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none">
              <option value="cliente">Cliente</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Admin</option>
            </select>
            <input v-model="confirmText" type="text" placeholder="Escribe cambiar rol para confirmar" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" />
            <div class="flex flex-wrap gap-3">
              <button @click="saveRole(selectedUser)" class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
                Confirmar cambio
              </button>
              <button @click="changingRoleId = null; confirmText = ''" class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
                Cancelar
              </button>
            </div>
          </div>

          <div v-else class="mt-4">
            <button @click="changingRoleId = selectedUser.id" class="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-200 hover:bg-blue-500/20">
              Cambiar rol del usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
