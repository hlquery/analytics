<template>
  <v-row>
    <v-col cols="12">
      <v-card variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Countries</span>
          <div class="d-flex ga-3 align-center">
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
          <v-data-table
            :headers="headers"
            :items="countries"
            :loading="loading"
            density="comfortable"
            :items-per-page="25"
          >
            <template #item.iso="{ value }">
              <v-btn variant="text" size="small" class="px-0 font-mono" @click="openCountry(value)">{{ value }}</v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listCountries } from '@/api';

const router = useRouter();

const windowHours = ref(24);
const windowChoices = [
  { title: '1h', value: 1 },
  { title: '6h', value: 6 },
  { title: '24h', value: 24 },
  { title: '7d', value: 24 * 7 },
  { title: '31d', value: 24 * 31 },
];

const loading = ref(false);
const countries = ref([]);

const appBar = inject('analyticsAppBar', null);

const headers = [
  { title: 'ISO', key: 'iso', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Events', key: 'events', sortable: true },
  { title: 'Searches', key: 'searches', sortable: true },
  { title: 'Clicks', key: 'clicks', sortable: true },
];

async function refresh() {
  loading.value = true;
  try {
    const data = await listCountries({ windowHours: windowHours.value, limit: 100 });
    countries.value = data.countries || [];
  } finally {
    loading.value = false;
  }
}

function openCountry(iso) {
  router.push({ path: '/events', query: { country: iso } });
}

onMounted(() => {
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
