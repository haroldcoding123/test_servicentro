<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, persistSession, readSession } from '../session.js'

const router = useRouter()
const user = ref(readSession().user || {
  nombre: 'Usuario',
  email: 'usuario@nexumservice.com',
  telefono: '+56 9 1234 5678',
  pais: 'Honduras',
  tipo: 'cliente',
  descripcion: 'Estoy buscando servicios confiables y de calidad para mi hogar y trabajo.'
})
const isEditing = ref(false)
const shareMenuOpen = ref(false)
const shareNotice = ref('')
const draft = ref({
  nombre: user.value.nombre || '',
  telefono: user.value.telefono || '',
  pais: user.value.pais || '',
  descripcion: user.value.descripcion || ''
})

const solicitudes = [
  { titulo: 'Instalación de cocina', estado: 'En revisión', fecha: 'Hace 2 días' },
  { titulo: 'Reparación de tubería', estado: 'Confirmado', fecha: 'Hace 5 días' },
  { titulo: 'Pintura de pared', estado: 'Finalizado', fecha: 'Hace 1 semana' }
]

function startEdit() {
  draft.value = {
    nombre: user.value.nombre || '',
    telefono: user.value.telefono || '',
    pais: user.value.pais || '',
    descripcion: user.value.descripcion || ''
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  draft.value = {
    nombre: user.value.nombre || '',
    telefono: user.value.telefono || '',
    pais: user.value.pais || '',
    descripcion: user.value.descripcion || ''
  }
}

async function saveProfile() {
  const sessionData = readSession()
  try {
    const response = await fetch(`http://localhost:3000/api/profile/${user.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: draft.value.nombre.trim(),
        telefono: draft.value.telefono.trim(),
        pais: draft.value.pais.trim(),
        descripcion: draft.value.descripcion.trim()
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'No se pudo guardar el perfil.')
    }

    const updatedUser = { ...user.value, ...data.user }
    user.value = updatedUser
    persistSession(sessionData.token, updatedUser)
    isEditing.value = false
  } catch (error) {
    console.error(error)
  }
}

function getProfileShareUrl() {
  return window.location.href
}

function closeShareMenu() {
  shareMenuOpen.value = false
  shareNotice.value = ''
}

async function handleShare() {
  const shareUrl = getProfileShareUrl()
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Nexumservice',
        text: `Mira este perfil: ${user.value.nombre}`,
        url: shareUrl
      })
      shareNotice.value = 'Perfil compartido'
      return
    } catch (error) {
      // Si el usuario cancela la acción, se abre el menú manual.
    }
  }

  shareMenuOpen.value = !shareMenuOpen.value
}

function shareByEmail() {
  const shareUrl = getProfileShareUrl()
  const subject = encodeURIComponent('Perfil de cliente en Nexumservice')
  const body = encodeURIComponent(`Mira este perfil: ${shareUrl}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
  closeShareMenu()
}

function shareByWhatsApp() {
  const shareUrl = getProfileShareUrl()
  const text = encodeURIComponent(`Mira este perfil: ${shareUrl}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
  closeShareMenu()
}

function shareBySms() {
  const shareUrl = getProfileShareUrl()
  const text = encodeURIComponent(`Mira este perfil: ${shareUrl}`)
  window.location.href = `sms:?&body=${text}`
  closeShareMenu()
}

async function copyProfileLink() {
  const url = getProfileShareUrl()
  try {
    await navigator.clipboard.writeText(url)
    shareNotice.value = 'Enlace copiado'
    setTimeout(() => {
      shareNotice.value = ''
    }, 1500)
  } catch (error) {
    shareNotice.value = 'No se pudo copiar el enlace'
  }
}

function logout() {
  clearSession()
  router.push('/')
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <header class="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
      <div class="text-xl font-black text-blue-400">Nexumservice</div>
      <div class="flex items-center gap-2">
        <button class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200">
          Mi perfil
        </button>
        <button v-if="!isEditing" @click="startEdit" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Editar
        </button>
        <div class="relative">
          <button @click="handleShare" class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700">
            Compartir
          </button>
          <div v-if="shareMenuOpen" class="absolute right-0 top-12 z-20 w-64 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-xl shadow-slate-950/40">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-semibold text-white">Compartir perfil</p>
              <button type="button" @click="closeShareMenu" class="text-xs text-slate-400 hover:text-slate-200">Cerrar</button>
            </div>
            <div class="space-y-2">
              <button type="button" @click="shareByEmail" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700">Correo electrónico</button>
              <button type="button" @click="shareByWhatsApp" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700">WhatsApp</button>
              <button type="button" @click="shareBySms" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700">Mensaje de texto</button>
              <button type="button" @click="copyProfileLink" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700">Copiar enlace</button>
            </div>
            <p v-if="shareNotice" class="mt-3 text-xs text-emerald-300">{{ shareNotice }}</p>
          </div>
        </div>
        <button @click="logout" class="rounded-lg border border-red-700/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">
          Salir
        </button>
      </div>
    </header>

    <section class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30">
      <div v-if="!isEditing" class="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-3xl font-bold text-blue-300">
          👤
        </div>

        <div class="flex-1">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 class="text-3xl font-bold text-white">{{ user.nombre }}</h1>
            <span class="inline-flex w-fit rounded-full border border-blue-700/50 bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-300">
              Cliente
            </span>
          </div>
          <p class="mt-1 text-slate-400">{{ user.email }}</p>
          <div class="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
            <span>📱 {{ user.telefono }}</span>
            <span>📍 {{ user.pais }}</span>
          </div>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-slate-300">Nombre</label>
          <input v-model="draft.nombre" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-slate-300">Teléfono</label>
            <input v-model="draft.telefono" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-300">País</label>
            <input v-model="draft.pais" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm text-slate-300">Sobre mí</label>
          <textarea v-model="draft.descripcion" rows="4" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </div>
        <div class="flex gap-3">
          <button @click="saveProfile" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Guardar</button>
          <button @click="cancelEdit" class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Cancelar</button>
        </div>
      </div>
    </section>

    <div v-if="!isEditing && user.descripcion" class="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
      <span class="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-200">Sobre mí</span>
      {{ user.descripcion }}
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-2">
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div class="mb-2 text-3xl">🔍</div>
        <h2 class="mb-1 text-xl font-bold text-white">Buscar un servicio</h2>
        <p class="mb-4 text-sm text-slate-400">Encuentra técnicos capacitados cerca de tu ubicación actual.</p>
        <button class="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500">
          Ir al directorio
        </button>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div class="mb-2 text-3xl">📋</div>
        <h2 class="mb-1 text-xl font-bold text-white">Mis solicitudes</h2>
        <p class="mb-4 text-sm text-slate-400">Revisa las cotizaciones y contrataciones que has realizado.</p>
        <div class="space-y-3">
          <div v-for="solicitud in solicitudes" :key="solicitud.titulo" class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div class="flex items-center justify-between gap-3">
              <p class="font-medium text-white">{{ solicitud.titulo }}</p>
              <span class="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                {{ solicitud.estado }}
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-400">{{ solicitud.fecha }}</p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
