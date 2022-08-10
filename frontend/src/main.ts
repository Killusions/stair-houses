import './styles.scss';
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import Home from './pages/Home.vue';
import Admin from './pages/Admin.vue';
import User from './pages/User.vue';
import Codes from './pages/Codes.vue';
import Redeem from './pages/Redeem.vue';
import Login from './pages/Login.vue';
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
  { path: '/codes', component: Codes },
  { path: '/redeem/:code', component: Redeem },
  { path: '/redeem', component: Redeem },
  { path: '/stateinfo', component: StateInfo },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
