<script setup>
import { computed, onMounted, ref } from 'vue'
import { readSession } from '../session.js'

const services = [
  { icon: '🪚', name: 'Carpintería' },
  { icon: '👨‍🏭', name: 'Soldadura' },
  { icon: '🧱', name: 'Albañilería' },
  { icon: '👷‍♂️', name: 'Ingeniería' },
  { icon: '🔧', name: 'Fontanería' },
  { icon: '🚗', name: 'Mecánica' },
  { icon: '🧹', name: 'Limpieza' },
  { icon: '🚘', name: 'Lavado de Autos' },
  { icon: '🎨', name: 'Pintura' },
  { icon: '⚡', name: 'Electricidad' }
]

const countries = ['Honduras', 'México', 'Colombia', 'Chile', 'Perú', 'Argentina', 'España']
const session = ref(readSession())
const query = ref('')
const country = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')

const isAuthenticated = computed(() => Boolean(session.value.user))
const searchActive = computed(() => query.value.trim().length > 0)

function refreshSession() {
  session.value = readSession()
}

function openAuthModal(type) {
  window.dispatchEvent(new CustomEvent('auth:open', { detail: { type } }))
}

function getPrimarySkill(tecnico) {
  const cleanedQuery = query.value.trim().toLowerCase()
  const skills = Array.isArray(tecnico.habilidades) ? tecnico.habilidades : []

  if (!skills.length) return 'Especialista'

  const match = skills.find((skill) => {
    const normalizedSkill = String(skill).trim().toLowerCase()
    return normalizedSkill.includes(cleanedQuery) || cleanedQuery.includes(normalizedSkill)
  })

  return match || skills[0]
}

async function loadResults(nextQuery = '') {
  const trimmedQuery = String(nextQuery || query.value).trim()

  if (!trimmedQuery) {
    results.value = []
    error.value = ''
    return
  }

  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams()
    params.set('query', trimmedQuery)
    if (country.value) params.set('pais', country.value)

    const response = await fetch(`http://localhost:3000/api/tecnicos/buscar?${params.toString()}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo realizar la búsqueda.')
    }

    results.value = Array.isArray(data.results) ? data.results : []
  } catch (searchError) {
    error.value = searchError.message || 'Ocurrió un error al buscar técnicos.'
    results.value = []
  } finally {
    loading.value = false
  }
}

function searchByService(serviceName) {
  query.value = serviceName
  loadResults(serviceName)
}

onMounted(() => {
  window.addEventListener('session:updated', refreshSession)
})
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 pb-20 pt-8">
    <section class="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 md:p-8">
      <p class="mb-4 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
        Directorio de servicios
      </p>

      <h1 class="text-4xl font-black tracking-tight text-white md:text-5xl">
        Encuentra técnicos confiables en tu zona
      </h1>

      <p class="mx-auto mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
        Carpinteros, fontaneros, soldadores y más, listos para ayudarte hoy mismo.
      </p>

      <div class="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div class="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              v-model="query"
              type="text"
              placeholder="¿Qué servicio buscas?"
              class="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              @keyup.enter="loadResults(query)"
            />
          </div>

          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg">📍</span>
            <select v-model="country" class="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-10 text-white focus:border-blue-500 focus:outline-none" @change="loadResults(query)">
              <option value="" selected>Todos los países</option>
              <option v-for="countryOption in countries" :key="countryOption" :value="countryOption">{{ countryOption }}</option>
            </select>
          </div>

          <button @click="loadResults(query)" class="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500">
            {{ loading ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="error" class="mt-10 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
      {{ error }}
    </section>

    <section v-if="searchActive && results.length" class="mt-10">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">Técnicos encontrados</h2>
        <span class="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">{{ results.length }} resultados</span>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="tecnico in results" :key="tecnico.id" class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-xl">👨‍🔧</div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ tecnico.nombre }}</h3>
              <p class="text-sm text-slate-400">{{ tecnico.pais }}</p>
            </div>
          </div>

          <div v-if="isAuthenticated" class="mt-4 space-y-4">
            <p class="text-sm leading-relaxed text-slate-300">
              {{ tecnico.descripcion || 'Especialista en soluciones rápidas y servicios profesionales.' }}
            </p>

            <div v-if="tecnico.habilidades?.length" class="flex flex-wrap gap-2">
              <span v-for="habilidad in tecnico.habilidades.slice(0, 5)" :key="habilidad" class="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200">
                {{ habilidad }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm text-slate-300">
              <span>📞 {{ tecnico.telefono || 'No disponible' }}</span>
              <span>💵 {{ tecnico.precio || 'A convenir' }}</span>
            </div>
          </div>

          <div v-else class="mt-4 space-y-3">
            <div class="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Especialidad</p>
              <p class="mt-1 text-sm font-medium text-white">{{ getPrimarySkill(tecnico) }}</p>
            </div>
            <p class="text-sm text-slate-300">Inicia sesión o regístrate para ver los detalles y contactar a este técnico.</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" @click="openAuthModal('login')" class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700">
                Ingresar
              </button>
              <button type="button" @click="openAuthModal('registro')" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Registrarse
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="mt-12">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">Nuestros Servicios</h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <button
          v-for="service in services"
          :key="service.name"
          type="button"
          @click="searchByService(service.name)"
          class="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center transition hover:-translate-y-1 hover:border-blue-500/40 hover:bg-slate-800"
        >
          <div class="mb-3 text-4xl">{{ service.icon }}</div>
          <h3 class="text-base font-semibold text-slate-100">{{ service.name }}</h3>
        </button>
      </div>
    </section>
  </main>
</template>
