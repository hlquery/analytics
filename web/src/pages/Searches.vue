<template>
  <v-row>
    <v-col cols="12">
      <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Searches</span>
          <div />
        </v-card-title>
        <v-card-text>
          <v-row dense class="mb-2">
            <v-col cols="12" md="6">
              <v-text-field v-model="filters.q" label="Query contains" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.collection" label="Collection" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.user" label="User" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.country" label="Country ISO" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="filters.authenticated"
                :items="authChoices"
                label="Auth"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="sortBy"
                :items="sortChoices"
                label="Sort by"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="sortDir" :items="dirChoices" label="Direction" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" md="12" class="d-flex align-center justify-end">
              <v-btn color="primary" variant="tonal" @click="applyFilters">apply</v-btn>
            </v-col>
          </v-row>

          <v-data-table-server
            :headers="headers"
            :items="rows"
            :loading="loading"
            :items-length="total"
            :items-per-page="pageSize"
            :page="page"
            @update:options="onOptions"
            density="comfortable"
          >
            <template #item.createdAt="{ value }">
              <span class="font-mono text-medium-emphasis">{{ formatIso(value) }}</span>
            </template>
            <template #item.authenticated="{ value }">
              <v-chip size="x-small" :color="value ? 'success' : 'default'" variant="tonal">
                {{ value ? 'yes' : 'no' }}
              </v-chip>
            </template>
            <template #item.query="{ value }">
              <span class="font-mono">{{ value }}</span>
            </template>
            <template #item.requesterIp="{ value }">
              <span class="font-mono text-medium-emphasis">{{ value || '' }}</span>
            </template>
            <template #item.requesterCountryIso="{ value }">
              <span class="font-mono">{{ value || '' }}</span>
            </template>
            <template #item.documentId="{ value }">
              <span class="font-mono text-medium-emphasis">{{ value || '' }}</span>
            </template>
          </v-data-table-server>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listSearches } from '@/api';

const route = useRoute();
const router = useRouter();

const headers = [
  { title: 'At', key: 'createdAt' },
  { title: 'Action', key: 'action' },
  { title: 'Collection', key: 'collection' },
  { title: 'Query', key: 'query' },
  { title: 'Found', key: 'found' },
  { title: 'Returned', key: 'returned' },
  { title: 'Time (ms)', key: 'searchTimeMs' },
  { title: 'Auth', key: 'authenticated' },
  { title: 'User', key: 'requesterUser' },
  { title: 'Country', key: 'requesterCountryIso' },
  { title: 'IP', key: 'requesterIp' },
  { title: 'Doc', key: 'documentId' },
];

const filters = reactive({
  q: '',
  collection: '',
  user: '',
  country: '',
  authenticated: 'any',
});

const authChoices = [
  { title: 'Any', value: 'any' },
  { title: 'Yes', value: 'true' },
  { title: 'No', value: 'false' },
];

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(50);
const loading = ref(false);

const sortBy = ref('createdAt');
const sortDir = ref('DESC');
const sortChoices = [
  { title: 'Time', value: 'createdAt' },
  { title: 'Search time', value: 'searchTimeMs' },
  { title: 'Found', value: 'found' },
  { title: 'Returned', value: 'returned' },
  { title: 'Collection', value: 'collection' },
  { title: 'Action', value: 'action' },
];
const dirChoices = [
  { title: 'Descending', value: 'DESC' },
  { title: 'Ascending', value: 'ASC' },
];

const appBar = inject('analyticsAppBar', null);

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
  try {
    const data = await listSearches({
      page: page.value,
      pageSize: pageSize.value,
      q: filters.q || undefined,
      collection: filters.collection || undefined,
      user: filters.user || undefined,
      country: filters.country || undefined,
      authenticated: filters.authenticated === 'any' ? undefined : filters.authenticated,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    });
    rows.value = data.searches || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  router.replace({
    query: {
      q: filters.q || undefined,
      collection: filters.collection || undefined,
      user: filters.user || undefined,
      country: filters.country || undefined,
      authenticated: filters.authenticated === 'any' ? undefined : filters.authenticated,
    },
  });
  refresh();
}

function onOptions(options) {
  page.value = options.page;
  pageSize.value = options.itemsPerPage;
  refresh();
}

onMounted(() => {
  filters.q = typeof route.query.q === 'string' ? route.query.q : '';
  filters.collection = typeof route.query.collection === 'string' ? route.query.collection : '';
  filters.user = typeof route.query.user === 'string' ? route.query.user : '';
  filters.country = typeof route.query.country === 'string' ? route.query.country : '';
  filters.authenticated = typeof route.query.authenticated === 'string' ? route.query.authenticated : 'any';
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

