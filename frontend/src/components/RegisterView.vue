<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProfileRoute, persistSession } from '../session.js'

const router = useRouter()

const form = ref({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  telefono: '',
  pais: '',
  role: 'cliente',
  habilidades: []
})

const submitting = ref(false)
const errorMessage = ref('')

const skillOptions = [
  'Carpintería',
  'Plomería',
  'Soldadura',
  'Albañilería',
  'Cerrajería',
  'Electricidad',
  'Ingeniería',
  'Pintura',
  'Limpieza',
  'Mecánica'
]

const countries = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador',
  'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay',
  'Perú', 'República Dominicana', 'Uruguay', 'Venezuela'
]

function normalizeRole(value) {
  const role = (value || 'cliente').toString().trim().toLowerCase()
  return role === 'tecnico' || role === 'proveedor' ? 'tecnico' : 'cliente'
}

function validatePhone(value) {
  const trimmed = value.trim()
  return /^\+?[0-9\s()-]{8,20}$/.test(trimmed)
}

function closeForm() {
  window.dispatchEvent(new CustomEvent('auth:close'))
  router.push('/')
}

function goToLogin() {
  window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'login' } }))
}

async function submitForm() {
  errorMessage.value = ''

  if (!form.value.nombre.trim() || !form.value.email.trim() || !form.value.password || !form.value.telefono.trim() || !form.value.pais) {
    errorMessage.value = 'Completa todos los campos del formulario.'
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    errorMessage.value = 'Ingresa un correo electrónico válido.'
    return
  }

  if (form.value.password.length < 6) {
    errorMessage.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  if (!validatePhone(form.value.telefono)) {
    errorMessage.value = 'Ingresa un teléfono válido, por ejemplo: +56 9 1234 5678.'
    return
  }

  submitting.value = true

  try {
    const role = normalizeRole(form.value.role)
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.value.nombre.trim(),
        email: form.value.email.trim(),
        password: form.value.password,
        confirmPassword: form.value.confirmPassword,
        telefono: form.value.telefono.trim(),
        pais: form.value.pais,
        role,
        tipo: role,
        habilidades: role === 'tecnico' ? form.value.habilidades : [],
        fechaRegistro: new Date().toISOString()
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo completar el registro.')
    }

    const token = data.token || ''
    const user = data.user || {
      id: data.id,
      nombre: form.value.nombre.trim(),
      email: form.value.email.trim(),
      role,
      tipo: role,
      pais: form.value.pais,
      telefono: form.value.telefono.trim()
    }

    persistSession(token, user)
    window.dispatchEvent(new CustomEvent('auth:success', { detail: { message: 'Ingreso exitoso' } }))
    window.dispatchEvent(new CustomEvent('auth:close'))
    router.push(getProfileRoute(role))
  } catch (error) {
    errorMessage.value = error.message || 'Ocurrió un error al registrarte.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-10">
    <section class="grid gap-8 rounded-[28px] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 md:grid-cols-2 md:p-8">
      <div class="flex flex-col justify-center">
        <div class="mb-4 flex items-center justify-between">
          <button type="button" @click="closeForm" class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700">Cerrar</button>
          <button type="button" @click="closeForm" class="text-sm text-blue-300 hover:text-blue-200">Volver</button>
        </div>

        <p class="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">Registro seguro</p>
        <h1 class="text-4xl font-black text-white">Únete a Nexumservice</h1>
        <p class="mt-4 text-base text-slate-300">
          Crea tu cuenta como cliente o como técnico y recibe un código de verificación por correo electrónico antes de activar tu acceso.
        </p>

        <div class="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p class="font-semibold text-white">Requisito de seguridad</p>
          <p class="mt-2">Tu contraseña se guarda en hash y tu acceso solo se activa después de verificar el correo.</p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="submitForm">
        <div v-if="errorMessage" class="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {{ errorMessage }}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm text-slate-300 sm:col-span-2">
            <span class="mb-1 block">Nombre completo</span>
            <input v-model="form.nombre" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Juan Pérez" />
          </label>

          <label class="block text-sm text-slate-300 sm:col-span-2">
            <span class="mb-1 block">Correo electrónico</span>
            <input v-model="form.email" type="email" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="correo@ejemplo.com" />
          </label>

          <label class="block text-sm text-slate-300">
            <span class="mb-1 block">Contraseña</span>
            <input v-model="form.password" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Mínimo 6 caracteres" />
          </label>

          <label class="block text-sm text-slate-300">
            <span class="mb-1 block">Confirmar contraseña</span>
            <input v-model="form.confirmPassword" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="Repite tu contraseña" />
          </label>

          <label class="block text-sm text-slate-300 sm:col-span-2">
            <span class="mb-1 block">Teléfono</span>
            <input v-model="form.telefono" type="tel" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" placeholder="+56 9 1234 5678" />
          </label>

          <label class="block text-sm text-slate-300 sm:col-span-2">
            <span class="mb-1 block">País</span>
            <select v-model="form.pais" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none">
              <option value="" disabled>Selecciona tu país</option>
              <option v-for="country in countries" :key="country" :value="country">{{ country }}</option>
            </select>
          </label>

          <div class="sm:col-span-2">
            <p class="mb-2 text-sm font-medium text-slate-300">Tipo de perfil</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                @click="form.role = 'cliente'"
                :class="[
                  'flex items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-base font-semibold transition',
                  form.role === 'cliente'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                    : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-600'
                ]"
              >
                <span class="text-2xl">👤</span>
                Cliente
              </button>

              <button
                type="button"
                @click="form.role = 'tecnico'"
                :class="[
                  'flex items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-base font-semibold transition',
                  form.role === 'tecnico'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                    : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-600'
                ]"
              >
                <span class="text-2xl">🛠️</span>
                Técnico
              </button>
            </div>
          </div>

          <div v-if="form.role === 'tecnico'" class="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p class="mb-2 text-sm font-medium text-slate-300">Habilidades o oficios</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="skill in skillOptions"
                :key="skill"
                type="button"
                @click="form.habilidades.includes(skill) ? form.habilidades = form.habilidades.filter(item => item !== skill) : form.habilidades.push(skill)"
                :class="[
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  form.habilidades.includes(skill)
                    ? 'border-blue-500 bg-blue-500/15 text-blue-200'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600'
                ]"
              >
                {{ skill }}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {{ submitting ? 'Registrando...' : 'Registrarme y enviar código' }}
        </button>

        <button
          type="button"
          @click="goToLogin"
          class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          Ya tengo una cuenta creada
        </button>
      </form>
    </section>
  </main>
</template>
