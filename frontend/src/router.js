import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from './components/LandingPage.vue'
import RegisterView from './components/RegisterView.vue'
import LoginView from './components/LoginView.vue'
import TecnicoProfile from './components/TecnicoProfile.vue'
import ClienteProfile from './components/ClienteProfile.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import { readSession } from './session.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: LandingPage },
    { path: '/registro', name: 'registro', component: RegisterView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/perfil-tecnico', name: 'perfil-tecnico', component: TecnicoProfile, meta: { requiresAuth: true } },
    { path: '/perfil-cliente', name: 'perfil-cliente', component: ClienteProfile, meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true, requiresAdmin: true } }
  ]
})

router.beforeEach((to, from, next) => {
  const { user } = readSession()

  if (to.meta.requiresAuth && !user) {
    next('/login')
    return
  }

  if (to.meta.requiresAdmin && (!user || (user.role || user.tipo || 'cliente').toLowerCase() !== 'admin')) {
    const role = (user?.role || user?.tipo || 'cliente').toLowerCase()
    next(role === 'tecnico' ? '/perfil-tecnico' : '/perfil-cliente')
    return
  }

  if (to.name === 'registro' && user) {
    const role = user.role || user.tipo || 'cliente'
    next(role === 'admin' ? '/admin' : role === 'tecnico' ? '/perfil-tecnico' : '/perfil-cliente')
    return
  }

  if (to.name === 'login' && user) {
    const role = user.role || user.tipo || 'cliente'
    next(role === 'admin' ? '/admin' : role === 'tecnico' ? '/perfil-tecnico' : '/perfil-cliente')
    return
  }

  next()
})

export default router
