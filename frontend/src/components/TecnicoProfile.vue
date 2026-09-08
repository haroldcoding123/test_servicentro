<script setup>
const specialties = [
  'Instalaciones',
  'Reparaciones',
  'Baños',
  'Calefacción',
  'Emergencias 24/7',
  'Fugas'
]

const works = [
  { emoji: '🚿', label: 'Instalación baño' },
  { emoji: '🔧', label: 'Reparación tubería' },
  { emoji: '🛁', label: 'Remodelación' },
  { emoji: '💧', label: 'Detección fuga' },
  { emoji: '🔥', label: 'Calefacción' },
  { emoji: '✨', label: 'Más trabajos' }
]
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/30">
      <div class="h-40 rounded-t-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950"></div>

      <div class="px-4 pb-6 md:px-6">
        <div class="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="flex items-end gap-4">
            <div class="flex h-28 w-28 items-center justify-center rounded-full border-4 border-slate-950 bg-slate-800 text-5xl shadow-xl">
              👨‍🔧
            </div>
            <div>
              <h1 class="text-3xl font-bold text-white">Carlos Rodríguez</h1>
              <p class="mt-1 text-sm text-slate-400">🔧 Fontanero profesional • 📍 Santiago, Chile</p>
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">⭐ 4.8 (127 reseñas)</span>
                <span class="rounded-full bg-green-500/10 px-2 py-1 text-green-300">✅ Verificado</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Contactar</button>
            <button class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Compartir</button>
          </div>
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-3">
          <div class="space-y-5 md:col-span-1">
            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Sobre mí</h2>
              <p class="text-sm leading-relaxed text-slate-300">
                Fontanero con más de 15 años de experiencia. Especializado en instalaciones residenciales,
                reparaciones de emergencia 24/7 y remodelaciones de baños. Trabajo garantizado y presupuesto sin compromiso.
              </p>
            </section>

            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Especialidades</h2>
              <div class="flex flex-wrap gap-2">
                <span v-for="item in specialties" :key="item" class="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200">
                  {{ item }}
                </span>
              </div>
            </section>

            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 class="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Información</h2>
              <ul class="space-y-2 text-sm text-slate-300">
                <li>📍 Santiago, Región Metropolitana</li>
                <li>📞 +56 9 1234 5678</li>
                <li>✉️ carlos@email.com</li>
                <li>🏠 Av. Principal 123, Depto 4B</li>
                <li>⏰ Lun - Sáb: 08:00 - 20:00</li>
                <li>💵 Desde $25.000 CLP</li>
              </ul>
            </section>
          </div>

          <div class="space-y-5 md:col-span-2">
            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Trabajos realizados</h2>
                <button class="text-sm text-blue-300 hover:text-blue-200">+ Agregar fotos</button>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div
                  v-for="work in works"
                  :key="work.label"
                  class="flex aspect-square items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-4xl text-slate-200 transition hover:border-blue-500"
                >
                  <span class="sr-only">{{ work.label }}</span>
                  {{ work.emoji }}
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Reseñas recientes</h2>
                <span class="text-xs text-slate-400">127 total</span>
              </div>

              <div class="space-y-3">
                <article class="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">👤</div>
                      <div>
                        <p class="text-sm font-semibold text-white">María González</p>
                        <p class="text-xs text-slate-400">Hace 2 días</p>
                      </div>
                    </div>
                    <span class="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p class="text-sm text-slate-300">Excelente trabajo, llegó puntual y dejó todo impecable.</p>
                </article>

                <article class="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">👤</div>
                      <div>
                        <p class="text-sm font-semibold text-white">Pedro Soto</p>
                        <p class="text-xs text-slate-400">Hace 1 semana</p>
                      </div>
                    </div>
                    <span class="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p class="text-sm text-slate-300">Tuve una emergencia con una fuga y vino enseguida. Muy profesional.</p>
                </article>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
