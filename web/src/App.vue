<template>
  <v-app class="analytics-shell">
    <v-navigation-drawer v-model="drawer" color="primary" theme="dark" width="280">
      <div class="px-4 py-4">
        <div class="text-h6 font-weight-bold">hlquery</div>
        <div class="text-caption text-medium-emphasis">analytics</div>
      </div>

      <v-divider />

      <v-list nav density="comfortable">
        <v-list-item :to="{ path: '/' }" prepend-icon="mdi-view-dashboard" title="Dashboard" />
        <v-list-item :to="{ path: '/events' }" prepend-icon="mdi-format-list-bulleted" title="Events" />
        <v-list-item :to="{ path: '/searches' }" prepend-icon="mdi-magnify" title="Searches" />
        <v-list-item :to="{ path: '/visitors' }" prepend-icon="mdi-account-outline" title="Visitors" />
        <v-list-item :to="{ path: '/countries' }" prepend-icon="mdi-earth" title="Countries" />
        <v-list-item :to="{ path: '/users' }" prepend-icon="mdi-account-group" title="Users" />
        <v-list-item :to="{ path: '/users', query: { user: 'alex' } }" prepend-icon="mdi-account" title="Alex" />
      </v-list>

      <v-list v-if="showAdmin" nav density="comfortable" class="mt-2">
        <v-list-subheader class="text-caption text-medium-emphasis">Admin</v-list-subheader>
        <v-list-item :to="{ path: '/admin/users' }" prepend-icon="mdi-shield-account" title="App Users" />
      </v-list>

      <template #append>
        <v-divider />
        <div class="px-4 py-3 text-caption text-medium-emphasis">
          API: <span class="font-mono">/api</span>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar color="#111827" elevation="0" height="62" density="comfortable" class="analytics-navbar" theme="dark">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title class="analytics-navbar__title">
        <span class="analytics-navbar__brand">hlquery</span>
        <span class="analytics-navbar__section">{{ title }}</span>
      </v-toolbar-title>
      <v-spacer />
      <v-tooltip text="Refresh" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            icon="mdi-refresh"
            :loading="appRefresh.loading"
            :disabled="!appRefresh.handler || appRefresh.loading"
            @click="triggerRefresh"
          />
        </template>
      </v-tooltip>
      <v-tooltip v-if="showLogout" text="Sign out" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" icon="mdi-logout" @click="signOut" />
        </template>
      </v-tooltip>
      <v-btn variant="text" icon="mdi-heart-pulse" :href="'/health'" target="_blank" />
    </v-app-bar>

    <v-main>
      <v-container class="py-6" fluid>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, onBeforeUnmount, provide, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { authState, logout } from '@/auth';

const drawer = ref(true);
const route = useRoute();

const title = computed(() => {
  if (route.path === '/events') return 'Events';
  if (route.path === '/searches') return 'Searches';
  if (route.path === '/visitors') return 'Visitors';
  if (route.path === '/countries') return 'Countries';
  if (route.path === '/users') return 'Users';
  if (route.path === '/admin/users') return 'App Users';
  return 'Dashboard';
});

const appRefresh = ref({
  handler: null,
  loading: false,
});

let stopLoadingWatch = null;

function registerRefresh({ handler, loading }) {
  appRefresh.value.handler = typeof handler === 'function' ? handler : null;

  if (stopLoadingWatch) stopLoadingWatch();
  stopLoadingWatch = null;
  appRefresh.value.loading = false;

  if (loading && typeof loading === 'object' && 'value' in loading) {
    stopLoadingWatch = watchEffect(() => {
      appRefresh.value.loading = Boolean(loading.value);
    });
  }
}

function clearRefresh(handler) {
  if (appRefresh.value.handler !== handler) return;
  appRefresh.value.handler = null;
  appRefresh.value.loading = false;
  if (stopLoadingWatch) stopLoadingWatch();
  stopLoadingWatch = null;
}

function triggerRefresh() {
  appRefresh.value.handler?.();
}

provide('analyticsAppBar', {
  registerRefresh,
  clearRefresh,
});

const showAdmin = computed(() => !authState.autologin && authState.user?.role === 'admin');
const showLogout = computed(() => !authState.autologin && authState.authenticated);

async function signOut() {
  await logout();
  window.location.href = '/login';
}

onBeforeUnmount(() => {
  if (stopLoadingWatch) stopLoadingWatch();
});
</script>

<style>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.analytics-shell .text-medium-emphasis {
  opacity: 0.9;
}
.analytics-navbar__title {
  display: inline-flex;
  gap: 10px;
  align-items: baseline;
}
.analytics-navbar__brand {
  font-weight: 800;
  letter-spacing: 0.2px;
}
.analytics-navbar__section {
  font-size: 0.95rem;
  font-weight: 600;
  opacity: 0.9;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 120ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
