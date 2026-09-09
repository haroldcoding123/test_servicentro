<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginView from './components/LoginView.vue'
import RegisterView from './components/RegisterView.vue'
import { clearSession, getProfileRoute, readSession } from './session.js'

const route = useRoute()
const router = useRouter()
const session = ref(readSession())
const authModal = ref(null)
const successMessage = ref('')
let successTimer = null

const refreshSession = () => {
  session.value = readSession()
}

const currentAuthComponent = computed(() => {
  if (authModal.value === 'login') return LoginView
  if (authModal.value === 'registro') return RegisterView
  return null
})

const isAuthenticated = computed(() => Boolean(session.value.user))
const currentRole = computed(() => (session.value.user?.role || session.value.user?.tipo || 'cliente'))
const showAuthActions = computed(() => !isAuthenticated.value)

const openAuthModal = (type) => {
  authModal.value = type
}

const closeAuthModal = () => {
  authModal.value = null
  if (route.path !== '/') {
    router.push('/')
  }
}

const showSuccessMessage = (message) => {
  successMessage.value = message
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => {
    successMessage.value = ''
  }, 1800)
}

onMounted(() => {
  window.addEventListener('session:updated', refreshSession)
  window.addEventListener('auth:open', (event) => {
    const type = event.detail?.type
    if (type === 'login' || type === 'registro') {
      openAuthModal(type)
    }
  })
  window.addEventListener('auth:close', closeAuthModal)
  window.addEventListener('auth:success', (event) => {
    showSuccessMessage(event.detail?.message || 'Ingreso exitoso')
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('session:updated', refreshSession)
  window.removeEventListener('auth:close', closeAuthModal)
  window.removeEventListener('auth:success', showSuccessMessage)
})

function goToProfile() {
  if (!session.value.user) return
  router.push(getProfileRoute(currentRole.value))
}

function logout() {
  clearSession()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <router-link to="/" class="text-xl font-black text-blue-400">Nexumservice</router-link>

        <div v-if="!isAuthenticated && showAuthActions" class="flex items-center gap-3">
          <button type="button" @click="openAuthModal('login')" class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Ingresar
          </button>
          <button type="button" @click="openAuthModal('registro')" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Registrarse
          </button>
        </div>

        <div v-else-if="isAuthenticated" class="flex items-center gap-3">
          <span class="text-sm font-medium text-slate-200">
            {{ session.user?.nombre || 'Usuario' }}
          </span>
          <button @click="goToProfile" class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Mi perfil
          </button>
          <button @click="logout" class="rounded-lg border border-red-700/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">
            Salir
          </button>
        </div>
      </div>
    </header>

    <router-view />

    <div v-if="successMessage" class="fixed left-1/2 top-6 z-[60] -translate-x-1/2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-lg shadow-emerald-950/30">
      <span class="mr-2">✓</span>{{ successMessage }}
    </div>

    <div v-if="authModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div class="relative w-full max-w-5xl">
        <button type="button" @click="closeAuthModal" class="absolute right-4 top-4 z-10 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800">
          ✕
        </button>
        <component :is="currentAuthComponent" />
      </div>
    </div>
  </div>
</template>
