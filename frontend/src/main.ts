import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue'
import Home from './pages/Home.vue'
import Admin from './pages/Admin.vue'
import Login from './pages/Login.vue'

import './styles.scss';

const routes = [
  { path: '/', component: Home },
  { path: '/admin', component: Admin },
  { path: '/login', component: Login },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const app = createApp(App);
app.use(router);
app.mount('#app');
