<script setup>
const services = [
  { icon: '🪚', name: 'Carpintería' },
  { icon: '👨‍🏭', name: 'Soldadura' },
  { icon: '🧱', name: 'Albañilería' },
  { icon: '👷‍♂️', name: 'Ingeniería' },
  { icon: '🔧', name: 'Fontanería' },
  { icon: '🧑‍🔧🚗', name: 'Mecánico' },
  { icon: '🧹', name: 'Limpieza de Casa' },
  { icon: '🚗', name: 'Lavado de Autos' },
  { icon: '🎨', name: 'Pintura de Casa' },
  { icon: '⚡', name: 'Electricistas' }
]
</script>

<template>
  <div class="bg-slate-950 text-slate-100">
    <header class="mx-auto max-w-5xl px-4 pb-10 pt-10 text-center md:pt-16">
      <p class="mb-4 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
        Directorio de servicios
      </p>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-5xl">
        Encuentra técnicos confiables en tu zona
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
        Carpinteros, fontaneros, soldadores y más, listos para ayudarte hoy mismo.
      </p>

      <div class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40">
        <div class="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              type="text"
              placeholder="¿Qué servicio buscas?"
              class="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg">📍</span>
            <select class="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-10 text-white focus:border-blue-500 focus:outline-none">
              <option value="" selected disabled>¿En qué país?</option>
              <option>Argentina</option>
              <option>Chile</option>
              <option>Colombia</option>
              <option>España</option>
              <option>México</option>
              <option>Perú</option>
            </select>
          </div>
          <button class="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500">
            Buscar
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pb-20">
      <h2 class="mb-6 text-2xl font-bold text-white">Nuestros Servicios</h2>
      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div
          v-for="service in services"
          :key="service.name"
          class="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center transition hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800"
        >
          <div class="mb-3 text-4xl">{{ service.icon }}</div>
          <h3 class="text-base font-semibold text-slate-100">{{ service.name }}</h3>
        </div>
      </div>
    </main>
  </div>
</template>
