import './styles.scss';
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import Home from './pages/Home.vue';
import Admin from './pages/Admin.vue';
import User from './pages/User.vue';
import Add from './pages/Add.vue';
import Login from './pages/Login.vue';
import Ranking from './components/Ranking.vue';
import StateInfo from './pages/StateInfo.vue';

import vhCheck from 'vh-check';
vhCheck();

import { APP_NAME, ORG_NAME } from '../../backend/src/constants';

document.title = ORG_NAME + ' ' + APP_NAME;

const routes = [
  { path: '/', component: Home },
  { path: '/admin', component: Admin },
  { path: '/user', component: User },
  { path: '/login', component: Login },
  { path: '/ranking', component: Ranking },
  { path: '/add', component: Add },
  { path: '/stateinfo', component: StateInfo },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
