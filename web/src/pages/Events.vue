<template>
  <v-row>
    <v-col cols="12">
        <v-card color="surface" variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Events</span>
          <div />
        </v-card-title>
        <v-card-text>
          <v-row dense class="mb-2">
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.action" label="Action" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.collection" label="Collection" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.country" label="Country ISO" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="filters.user" label="User" density="compact" variant="outlined" clearable />
            </v-col>
            <v-col cols="12" md="6">
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
            <v-col cols="12" md="3" class="d-flex align-center justify-end">
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
import { inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listEvents } from '@/api';

const route = useRoute();
const router = useRouter();

const headers = [
  { title: 'At', key: 'createdAt' },
  { title: 'Action', key: 'action' },
  { title: 'Collection', key: 'collection' },
  { title: 'Country', key: 'requesterCountryIso' },
  { title: 'IP', key: 'requesterIp' },
  { title: 'Count', key: 'count' },
  { title: 'Searches', key: 'searchCount' },
  { title: 'Clicks', key: 'clickCount' },
];

const filters = reactive({
  action: '',
  collection: '',
  country: '',
  user: '',
});

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(50);
const loading = ref(false);

const appBar = inject('analyticsAppBar', null);

const sortBy = ref('createdAt');
const sortDir = ref('DESC');
const sortChoices = [
  { title: 'Time', value: 'createdAt' },
  { title: 'Searches', value: 'searchCount' },
  { title: 'Clicks', value: 'clickCount' },
  { title: 'Country', value: 'requesterCountryIso' },
  { title: 'Action', value: 'action' },
  { title: 'Collection', value: 'collection' },
];
const dirChoices = [
  { title: 'Descending', value: 'DESC' },
  { title: 'Ascending', value: 'ASC' },
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
  try {
    const data = await listEvents({
      page: page.value,
      pageSize: pageSize.value,
      action: filters.action || undefined,
      collection: filters.collection || undefined,
      country: filters.country || undefined,
      user: filters.user || undefined,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    });
    rows.value = data.events || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  router.replace({
    query: {
      action: filters.action || undefined,
      collection: filters.collection || undefined,
      country: filters.country || undefined,
      user: filters.user || undefined,
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
  filters.action = typeof route.query.action === 'string' ? route.query.action : '';
  filters.collection = typeof route.query.collection === 'string' ? route.query.collection : '';
  filters.country = typeof route.query.country === 'string' ? route.query.country : '';
  filters.user = typeof route.query.user === 'string' ? route.query.user : '';
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
