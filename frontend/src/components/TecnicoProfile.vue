<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, persistSession, readSession } from '../session.js'

const router = useRouter()
const fileInput = ref(null)
const uploading = ref(false)
const isEditing = ref(false)
const shareMenuOpen = ref(false)
const shareNotice = ref('')
const skillOptions = ['Carpintería', 'Plomería', 'Soldadura', 'Albañilería', 'Cerrajería', 'Electricidad', 'Ingeniería', 'Pintura', 'Limpieza', 'Mecánica']
const sessionUser = ref(readSession().user || {
  nombre: 'Carlos Rodríguez',
  email: 'carlos@nexumservice.com',
  telefono: '+56 9 1234 5678',
  pais: 'Honduras',
  descripcion: 'Especialista en instalaciones y reparaciones con más de 10 años de experiencia en proyectos residenciales y comerciales.',
  direccion: 'Tegucigalpa, Honduras',
  horario: 'Lun - Sáb: 08:00 - 18:00',
  precio: 'Desde L 1,250',
  tipo: 'tecnico'
})
const draft = ref({
  nombre: sessionUser.value.nombre || '',
  telefono: sessionUser.value.telefono || '',
  pais: sessionUser.value.pais || '',
  descripcion: sessionUser.value.descripcion || '',
  habilidades: Array.isArray(sessionUser.value.habilidades) ? [...sessionUser.value.habilidades] : []
})
const user = computed(() => sessionUser.value)
const isOwner = computed(() => Boolean(sessionUser.value && sessionUser.value.id))

const specialties = computed(() => {
  const savedSkills = Array.isArray(sessionUser.value.habilidades) ? sessionUser.value.habilidades : []
  return savedSkills.length ? savedSkills : ['Instalaciones', 'Reparaciones', 'Baños', 'Electricidad', 'Emergencias 24/7', 'Fugas']
})
const works = computed(() => {
  const savedWorks = Array.isArray(user.value.trabajos) ? user.value.trabajos : []
  const fallback = [
    { emoji: '🚿', label: 'Instalación de baño' },
    { emoji: '🔧', label: 'Reparación' },
    { emoji: '🛁', label: 'Remodelación' },
    { emoji: '💧', label: 'Detección de fuga' },
    { emoji: '🔥', label: 'Calefacción' },
    { emoji: '✨', label: 'Más trabajos' }
  ]

  if (!savedWorks.length) return fallback
  return savedWorks.map((work) => ({
    ...work,
    emoji: work.foto ? '' : '📸',
    label: work.titulo || 'Trabajo'
  }))
})

function startEdit() {
  draft.value = {
    nombre: sessionUser.value.nombre || '',
    telefono: sessionUser.value.telefono || '',
    pais: sessionUser.value.pais || '',
    descripcion: sessionUser.value.descripcion || '',
    habilidades: Array.isArray(sessionUser.value.habilidades) ? [...sessionUser.value.habilidades] : []
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  draft.value = {
    nombre: sessionUser.value.nombre || '',
    telefono: sessionUser.value.telefono || '',
    pais: sessionUser.value.pais || '',
    descripcion: sessionUser.value.descripcion || '',
    habilidades: Array.isArray(sessionUser.value.habilidades) ? [...sessionUser.value.habilidades] : []
  }
}

async function saveProfile() {
  const sessionData = readSession()
  try {
    const response = await fetch(`http://localhost:3000/api/profile/${sessionUser.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: draft.value.nombre.trim(),
        telefono: draft.value.telefono.trim(),
        pais: draft.value.pais.trim(),
        descripcion: draft.value.descripcion.trim(),
        habilidades: draft.value.habilidades
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'No se pudo guardar el perfil.')
    }

    const updatedUser = { ...sessionUser.value, ...data.user }
    sessionUser.value = updatedUser
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
        text: `Mira este perfil: ${sessionUser.value.nombre}`,
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
  const subject = encodeURIComponent('Perfil de técnico en Nexumservice')
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

function triggerFilePicker() {
  fileInput.value?.click()
}

async function handleFileSelection(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length || !user.value.id) return

  uploading.value = true
  const formData = new FormData()
  files.forEach(file => formData.append('fotos', file))

  try {
    const response = await fetch(`http://localhost:3000/api/profile/${user.value.id}/trabajos`, {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'No se pudo subir la imagen.')
    }

    const sessionData = readSession()
    const updatedTrabajos = [...(Array.isArray(sessionData.user?.trabajos) ? sessionData.user.trabajos : []), ...(Array.isArray(data.trabajos) ? data.trabajos : [])]
    persistSession(sessionData.token, { ...sessionData.user, trabajos: updatedTrabajos })
    event.target.value = ''
  } catch (error) {
    console.error(error)
  } finally {
    uploading.value = false
  }
}

async function deleteWork(workId) {
  if (!user.value.id || !workId) return

  try {
    const response = await fetch(`http://localhost:3000/api/profile/${user.value.id}/trabajos/${workId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'No se pudo eliminar la imagen.')
    }

    const sessionData = readSession()
    const updatedTrabajos = (Array.isArray(sessionData.user?.trabajos) ? sessionData.user.trabajos : []).filter(work => work.workId !== workId)
    persistSession(sessionData.token, { ...sessionData.user, trabajos: updatedTrabajos })
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <header class="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
      <div class="text-xl font-black text-blue-400">Nexumservice</div>
      <div class="flex items-center gap-2">
        <button class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200">
          Mi Perfil
        </button>
        <button v-if="!isEditing" @click="startEdit" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Editar
        </button>
        <button @click="logout" class="rounded-lg border border-red-700/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">
          Salir
        </button>
      </div>
    </header>

    <div class="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/30">
      <div class="h-36 rounded-t-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950"></div>

      <div class="px-5 pb-6 md:px-6">
        <div class="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="flex items-end gap-4">
            <div class="flex h-28 w-28 items-center justify-center rounded-full border-4 border-slate-950 bg-slate-800 text-5xl shadow-xl">
              👨‍🔧
            </div>

            <div>
              <h1 class="text-3xl font-bold text-white">{{ user.nombre }}</h1>
              <p class="mt-1 text-sm text-slate-400">🔧 Técnico profesional • 📍 {{ user.pais }}</p>
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">⭐ 4.8 (127 reseñas)</span>
                <span class="rounded-full bg-green-500/10 px-2 py-1 text-green-300">✅ Verificado</span>
              </div>
            </div>
          </div>

          <div v-if="isEditing" class="flex gap-2">
            <button @click="saveProfile" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Guardar</button>
            <button @click="cancelEdit" class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Cancelar</button>
          </div>

          <div class="flex gap-2">
            <a :href="`tel:${user.telefono || ''}`" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Contactar</a>
            <div class="relative">
              <button @click="handleShare" class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Compartir</button>
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
          </div>
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-3">
          <div class="space-y-5 md:col-span-1">
            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Sobre mí</h2>
              <p v-if="!isEditing" class="text-sm leading-relaxed text-slate-300">{{ user.descripcion }}</p>
              <textarea v-else v-model="draft.descripcion" rows="4" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
            </section>

            <section v-if="isEditing" class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Datos personales</h2>
              <div class="space-y-3 text-sm text-slate-300">
                <label class="block">
                  <span class="mb-1 block text-slate-400">Teléfono</span>
                  <input v-model="draft.telefono" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label class="block">
                  <span class="mb-1 block text-slate-400">País</span>
                  <input v-model="draft.pais" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
              </div>
            </section>

            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Especialidades</h2>
              <div v-if="!isEditing" class="flex flex-wrap gap-2">
                <span v-for="item in specialties" :key="item" class="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200">
                  {{ item }}
                </span>
              </div>
              <div v-else class="flex flex-wrap gap-2">
                <button
                  v-for="skill in skillOptions"
                  :key="skill"
                  type="button"
                  @click="draft.habilidades.includes(skill) ? draft.habilidades = draft.habilidades.filter(item => item !== skill) : draft.habilidades.push(skill)"
                  :class="[
                    'rounded-full border px-3 py-1.5 text-xs transition',
                    draft.habilidades.includes(skill)
                      ? 'border-blue-500 bg-blue-500/15 text-blue-200'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600'
                  ]"
                >
                  {{ skill }}
                </button>
              </div>
            </section>

            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Información</h2>
              <ul class="space-y-2 text-sm text-slate-300">
                <li>📍 {{ user.direccion || user.pais }}</li>
                <li>📞 {{ user.telefono }}</li>
                <li>✉️ {{ user.email }}</li>
                <li>⏰ {{ user.horario }}</li>
                <li>💵 {{ user.precio }}</li>
              </ul>
            </section>
          </div>

          <div class="space-y-5 md:col-span-2">
            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Trabajos realizados</h2>
                <div v-if="isOwner" class="flex items-center gap-2">
                  <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelection" />
                  <button type="button" @click="triggerFilePicker" class="text-sm text-blue-300 hover:text-blue-200">
                    {{ uploading ? 'Subiendo...' : '+ Agregar fotos' }}
                  </button>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div
                  v-for="work in works"
                  :key="work.workId || work.label || work.foto"
                  class="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-4xl text-slate-200 transition hover:border-blue-500"
                >
                  <img
                    v-if="work.foto"
                    :src="work.foto.startsWith('http') ? work.foto : 'http://localhost:3000' + work.foto"
                    :alt="work.label || 'Trabajo realizado'"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center">
                    <span class="sr-only">{{ work.label }}</span>
                    {{ work.emoji }}
                  </div>

                  <button
                    v-if="isOwner && work.workId"
                    type="button"
                    @click="deleteWork(work.workId)"
                    class="absolute right-2 top-2 hidden rounded-full border border-red-400 bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-red-200 group-hover:inline-flex"
                  >
                    X
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
