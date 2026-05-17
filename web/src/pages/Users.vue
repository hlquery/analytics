<template>
  <v-row>
    <v-col cols="12">
      <v-card variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Users</span>
          <div class="d-flex ga-3 align-center">
            <v-text-field
              v-model="user"
              label="User"
              density="compact"
              variant="outlined"
              clearable
              style="max-width: 220px"
            />
            <v-select
              v-model="windowHours"
              :items="windowChoices"
              label="Window"
              density="compact"
              variant="outlined"
              style="max-width: 160px"
            />
          </div>
        </v-card-title>
        <v-card-text>
          <v-row dense class="mb-4">
            <v-col cols="12">
              <v-data-table
                :headers="userHeaders"
                :items="users"
                :loading="usersLoading"
                density="comfortable"
                :items-per-page="10"
              >
                <template #item.user="{ value }">
                  <v-btn variant="text" size="small" class="px-0" @click="selectUser(value)">{{ value }}</v-btn>
                </template>
              </v-data-table>
            </v-col>
          </v-row>

          <v-data-table-server
            :headers="eventHeaders"
            :items="rows"
            :loading="eventsLoading"
            :items-length="total"
            :items-per-page="pageSize"
            :page="page"
            @update:options="onOptions"
            density="comfortable"
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
          </v-data-table-server>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listEvents, listUsers } from '@/api';

const route = useRoute();
const router = useRouter();

const user = ref('sam');
const windowHours = ref(24);
const windowChoices = [
  { title: '1h', value: 1 },
  { title: '6h', value: 6 },
  { title: '24h', value: 24 },
  { title: '7d', value: 24 * 7 },
  { title: '31d', value: 24 * 31 },
];

const usersLoading = ref(false);
const users = ref([]);

const eventHeaders = [
  { title: 'At', key: 'createdAt' },
  { title: 'Action', key: 'action' },
  { title: 'Collection', key: 'collection' },
  { title: 'Country', key: 'requesterCountryIso' },
  { title: 'IP', key: 'requesterIp' },
  { title: 'Count', key: 'count' },
  { title: 'Searches', key: 'searchCount' },
  { title: 'Clicks', key: 'clickCount' },
];

const userHeaders = [
  { title: 'User', key: 'user', sortable: true },
  { title: 'Events', key: 'events', sortable: true },
  { title: 'Searches', key: 'searches', sortable: true },
  { title: 'Clicks', key: 'clicks', sortable: true },
];

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(50);
const eventsLoading = ref(false);

const appBar = inject('analyticsAppBar', null);
const loading = computed(() => usersLoading.value || eventsLoading.value);

function formatIso(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString();
  } catch (_) {
    return String(value);
  }
}

async function refreshUsers() {
  usersLoading.value = true;
  try {
    const data = await listUsers({ windowHours: windowHours.value, limit: 50 });
    users.value = data.users || [];
  } finally {
    usersLoading.value = false;
  }
}

async function refreshEvents() {
  eventsLoading.value = true;
  try {
    const data = await listEvents({
      page: page.value,
      pageSize: pageSize.value,
      user: user.value || undefined,
      sortBy: 'createdAt',
      sortDir: 'DESC',
    });
    rows.value = data.events || [];
    total.value = data.total || 0;
  } finally {
    eventsLoading.value = false;
  }
}

async function refresh() {
  await Promise.all([refreshUsers(), refreshEvents()]);
}

function selectUser(value) {
  user.value = value || '';
  page.value = 1;
  router.replace({ query: { user: user.value || undefined } });
  refreshEvents();
}

function onOptions(options) {
  page.value = options.page;
  pageSize.value = options.itemsPerPage;
  refreshEvents();
}

onMounted(() => {
  user.value = typeof route.query.user === 'string' ? route.query.user : 'sam';
  appBar?.registerRefresh({ handler: refresh, loading });
  refresh();
});

onBeforeUnmount(() => {
  appBar?.clearRefresh(refresh);
});
</script>

<style scoped>
.border {
  border: 1px solid #e2e8f0;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
