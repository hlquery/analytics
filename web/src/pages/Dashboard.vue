<template>
  <v-row>
    <v-col cols="12" md="4">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Last 24h</span>
          <v-chip size="small" color="primary" variant="tonal">live</v-chip>
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Searches</div>
              <div class="text-h5 font-weight-bold">{{ stats?.totals?.searches ?? '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Events</div>
              <div class="text-h5 font-weight-bold">{{ stats?.totals?.events ?? '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Clicks</div>
              <div class="text-h5 font-weight-bold">{{ stats?.totals?.clicks ?? '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Users</div>
              <div class="text-h5 font-weight-bold">{{ stats?.totals?.users ?? '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Countries</div>
              <div class="text-h5 font-weight-bold">{{ stats?.totals?.countries ?? '—' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Top country</div>
              <div class="text-h6 font-weight-bold font-mono">{{ stats?.topCountries?.[0]?.iso ?? '—' }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis">Search auth</div>
              <div class="d-flex ga-2 mt-1">
                <v-chip size="small" color="success" variant="tonal">
                  authed: {{ stats?.searchesAuth?.authenticated ?? 0 }}
                </v-chip>
                <v-chip size="small" color="default" variant="tonal">
                  anon: {{ stats?.searchesAuth?.anonymous ?? 0 }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
          <div class="text-caption text-medium-emphasis mt-4">
            Time window: <span class="font-mono">{{ stats?.window?.sinceIso ?? '—' }}</span>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="8">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Top Countries</span>
          <v-btn size="small" variant="text" to="/events" prepend-icon="mdi-format-list-bulleted">events</v-btn>
        </v-card-title>
        <v-card-text>
          <div style="height: 260px">
            <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
            <div v-else class="text-medium-emphasis">No data yet.</div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Top Collections</span>
          <v-btn size="small" variant="text" to="/events" prepend-icon="mdi-format-list-bulleted">events</v-btn>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="collectionHeaders"
            :items="stats?.topCollections ?? []"
            density="comfortable"
            :items-per-page="5"
          >
            <template #item.collection="{ value }">
              <span class="font-mono">{{ value }}</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Top Users</span>
          <v-btn size="small" variant="text" to="/users" prepend-icon="mdi-account-group">users</v-btn>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="userHeaders"
            :items="stats?.topUsers ?? []"
            density="comfortable"
            :items-per-page="5"
          >
            <template #item.user="{ value }">
              <span class="font-mono">{{ value }}</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Recent Searches</span>
          <v-btn size="small" variant="text" to="/searches" prepend-icon="mdi-magnify">searches</v-btn>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="searchHeaders"
            :items="stats?.recentSearches ?? []"
            density="comfortable"
            :items-per-page="10"
          >
            <template #item.createdAt="{ value }">
              <span class="font-mono text-medium-emphasis">{{ formatIso(value) }}</span>
            </template>
            <template #item.query="{ value }">
              <span class="font-mono">{{ value }}</span>
            </template>
            <template #item.requesterCountryIso="{ value }">
              <span class="font-mono">{{ value || '' }}</span>
            </template>
            <template #item.requesterIp="{ value }">
              <span class="font-mono text-medium-emphasis">{{ value || '' }}</span>
            </template>
            <template #item.authenticated="{ value }">
              <v-chip size="x-small" :color="value ? 'success' : 'default'" variant="tonal">
                {{ value ? 'yes' : 'no' }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Recent Events</span>
          <div class="d-flex align-center ga-2">
            <v-btn
              size="small"
              variant="text"
              :loading="forcingRefresh"
              :disabled="forcingRefresh"
              @click="forceRefresh"
              prepend-icon="mdi-cloud-sync"
            >
              force refresh
            </v-btn>
          </div>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">
            {{ error }}
          </v-alert>
          <v-data-table
            :headers="headers"
            :items="stats?.recentEvents ?? []"
            density="comfortable"
            :items-per-page="10"
          >
            <template #item.createdAt="{ value }">
              <span class="font-mono text-medium-emphasis">{{ formatIso(value) }}</span>
            </template>
            <template #item.requesterIp="{ value }">
              <span class="font-mono text-medium-emphasis">{{ value || '' }}</span>
            </template>
            <template #item.requesterCountryIso="{ value }">
              <span class="font-mono">{{ value || '' }}</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { forceHlqueryRefresh, getStats } from '@/api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const stats = ref(null);
const loading = ref(false);
const forcingRefresh = ref(false);
const error = ref('');

const appBar = inject('analyticsAppBar', null);

const collectionHeaders = [
  { title: 'Collection', key: 'collection' },
  { title: 'Searches', key: 'searches' },
  { title: 'Clicks', key: 'clicks' },
  { title: 'Events', key: 'events' },
];

const userHeaders = [
  { title: 'User', key: 'user' },
  { title: 'Events', key: 'events' },
  { title: 'Searches', key: 'searches' },
  { title: 'Clicks', key: 'clicks' },
];

const searchHeaders = [
  { title: 'At', key: 'createdAt' },
  { title: 'Collection', key: 'collection' },
  { title: 'Query', key: 'query' },
  { title: 'User', key: 'requesterUser' },
  { title: 'Auth', key: 'authenticated' },
  { title: 'Country', key: 'requesterCountryIso' },
  { title: 'IP', key: 'requesterIp' },
  { title: 'Time (ms)', key: 'searchTimeMs' },
];

const headers = [
  { title: 'At', key: 'createdAt', sortable: true },
  { title: 'Action', key: 'action', sortable: true },
  { title: 'Collection', key: 'collection', sortable: true },
  { title: 'Country', key: 'requesterCountryIso', sortable: true },
  { title: 'IP', key: 'requesterIp', sortable: false },
  { title: 'Searches', key: 'searchCount', sortable: true },
  { title: 'Clicks', key: 'clickCount', sortable: true },
];

function formatIso(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString();
  } catch (_) {
    return String(value);
  }
}

async function refresh() {
  loading.value = true;
  error.value = '';
  try {
    stats.value = await getStats({ windowHours: 24, recentLimit: 50, topCountriesLimit: 10 });
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to refresh stats.';
  } finally {
    loading.value = false;
  }
}

async function forceRefresh() {
  forcingRefresh.value = true;
  error.value = '';
  try {
    await forceHlqueryRefresh();
    await refresh();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to force refresh.';
  } finally {
    forcingRefresh.value = false;
  }
}

onMounted(() => {
  appBar?.registerRefresh({ handler: refresh, loading });
  refresh();
});

onBeforeUnmount(() => {
  appBar?.clearRefresh(refresh);
});

const chartData = computed(() => {
  const rows = stats.value?.topCountries || [];
  if (!rows.length) return null;
  return {
    labels: rows.map((r) => r.iso),
    datasets: [
      {
        label: 'Searches',
        data: rows.map((r) => r.searches),
        backgroundColor: 'rgba(0, 103, 178, 0.85)',
        borderRadius: 8,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } },
    y: { ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } },
  },
};
</script>

<style scoped>
.border {
  border: 1px solid #e2e8f0;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
