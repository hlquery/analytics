import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import '@mdi/font/css/materialdesignicons.css';
import '@/styles.css';

import App from '@/App.vue';
import Dashboard from '@/pages/Dashboard.vue';
import Events from '@/pages/Events.vue';
import Countries from '@/pages/Countries.vue';
import Users from '@/pages/Users.vue';
import Searches from '@/pages/Searches.vue';
import Visitors from '@/pages/Visitors.vue';
import Login from '@/pages/Login.vue';
import AdminUsers from '@/pages/AdminUsers.vue';
import { fetchMe } from '@/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Dashboard },
    { path: '/events', component: Events },
    { path: '/searches', component: Searches },
    { path: '/visitors', component: Visitors },
    { path: '/countries', component: Countries },
    { path: '/users', component: Users },
    { path: '/admin/users', component: AdminUsers },
  ],
});

router.beforeEach(async (to) => {
  if (to.path === '/login') return true;
  const me = await fetchMe();
  if (me.autologin || me.authenticated) return true;
  return { path: '/login', query: { next: to.fullPath } };
});

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#f8fafc',
          surface: '#ffffff',
          primary: '#0067b2',
          secondary: '#0f172a',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          success: '#10b981',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
});

createApp(App).use(router).use(vuetify).mount('#app');
