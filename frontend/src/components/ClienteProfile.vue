<script setup>
const paises = {
  ar: 'Argentina',
  bo: 'Bolivia',
  br: 'Brasil',
  cl: 'Chile',
  co: 'Colombia',
  cr: 'Costa Rica',
  cu: 'Cuba',
  ec: 'Ecuador',
  sv: 'El Salvador',
  gt: 'Guatemala',
  hn: 'Honduras',
  mx: 'México',
  ni: 'Nicaragua',
  pa: 'Panamá',
  py: 'Paraguay',
  pe: 'Perú',
  do: 'República Dominicana',
  uy: 'Uruguay',
  ve: 'Venezuela'
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-3xl font-bold text-blue-300">
          U
        </div>

        <div class="flex-1">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 class="text-3xl font-bold text-white">Usuario</h1>
            <span class="inline-flex w-fit rounded-full border border-blue-700/50 bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-300">
              Cliente
            </span>
          </div>
          <p class="mt-1 text-slate-400">usuario@email.com</p>
          <div class="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
            <span>📱 +56 9 1234 5678</span>
            <span>📍 {{ paises.cl }}</span>
          </div>
        </div>
      </div>
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
        <button class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700">
          Ver historial
        </button>
      </section>
    </div>
  </div>
</template>
