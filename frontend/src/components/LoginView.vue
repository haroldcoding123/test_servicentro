<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProfileRoute, persistSession } from '../session.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

function closeForm() {
  window.dispatchEvent(new CustomEvent('auth:close'))
  router.push('/')
}

function goToRegister() {
  window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'registro' } }))
}

async function login() {
  errorMessage.value = ''

  if (!email.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Ingresa correo y contraseña.'
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Credenciales incorrectas.')
    }

    const user = data.user || { email: email.value.trim() }
    persistSession(data.token, user)
    window.dispatchEvent(new CustomEvent('auth:success', { detail: { message: 'Ingreso exitoso' } }))
    window.dispatchEvent(new CustomEvent('auth:close'))
    const role = (user.role || user.tipo || 'cliente').toLowerCase()
    router.push(role === 'tecnico' ? '/perfil-tecnico' : '/perfil-cliente')
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo iniciar sesión.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex max-w-md items-center justify-center px-4 py-16">
    <section class="w-full rounded-[28px] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div class="mb-4 flex items-center justify-between">
        <button type="button" @click="closeForm" class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700">Cerrar</button>
        <button type="button" @click="closeForm" class="text-sm text-blue-300 hover:text-blue-200">Volver</button>
      </div>

      <p class="mb-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">Ingresar</p>
      <h1 class="text-center text-3xl font-black text-white">Bienvenido a Nexumservice</h1>

      <form class="mt-6 space-y-4" @submit.prevent="login">
        <div v-if="errorMessage" class="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {{ errorMessage }}
        </div>

        <label class="block text-sm text-slate-300">
          <span class="mb-1 block">Correo electrónico</span>
          <input v-model="email" type="email" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="correo@ejemplo.com" />
        </label>

        <label class="block text-sm text-slate-300">
          <span class="mb-1 block">Contraseña</span>
          <input v-model="password" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Tu contraseña" />
        </label>

        <button :disabled="isSubmitting" type="submit" class="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70">
          {{ isSubmitting ? 'Ingresando...' : 'Ingresar' }}
        </button>

        <button type="button" @click="goToRegister" class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base font-semibold text-slate-200 transition hover:bg-slate-700">
          ¿No tienes cuenta? Regístrate
        </button>
      </form>
    </section>
  </main>
</template>
