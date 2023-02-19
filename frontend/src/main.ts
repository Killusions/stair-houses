import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import BreakNotice from './pages/BreakNotice.vue';
import Home from './pages/Home.vue';
import Admin from './pages/Admin.vue';
import Login from './pages/Login.vue';
import Ranking from './components/Ranking.vue';

import './styles.scss';

const routes = [
  { path: '/', redirect: '/notice' },
  { path: '/notice', component: BreakNotice },
  { path: '/home', component: Home },
  { path: '/admin', component: Admin },
  { path: '/login', component: Login },
  { path: '/ranking', component: Ranking },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
