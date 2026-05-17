<template>
  <v-row>
    <v-col cols="12">
      <v-card variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Unique Visitors</span>
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
          <v-row dense class="mb-2">
            <v-col cols="12" md="4">
              <v-card variant="flat" class="border-subtle">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis">Total unique visitors</div>
                  <div class="text-h5 font-weight-bold">{{ data?.totals?.uniqueVisitors ?? '—' }}</div>
                  <div class="text-caption text-medium-emphasis mt-2">
                    Since: <span class="font-mono">{{ data?.window?.sinceIso ?? '—' }}</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-data-table
            :headers="headers"
            :items="data?.byCountry ?? []"
            :loading="loading"
            density="comfortable"
            :items-per-page="25"
          >
            <template #item.iso="{ value }">
              <span class="font-mono">{{ value }}</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getVisitors } from '@/api';

const appBar = inject('analyticsAppBar', null);

const windowHours = ref(24);
const windowChoices = [
  { title: '1h', value: 1 },
  { title: '6h', value: 6 },
  { title: '24h', value: 24 },
  { title: '7d', value: 24 * 7 },
  { title: '31d', value: 24 * 31 },
];

const headers = [
  { title: 'Country', key: 'iso', sortable: true },
  { title: 'Unique visitors', key: 'uniqueVisitors', sortable: true },
];

const data = ref(null);
const loading = ref(false);

async function refresh() {
  loading.value = true;
  try {
    data.value = await getVisitors({ windowHours: windowHours.value, limit: 50 });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  appBar?.registerRefresh({ handler: refresh, loading });
  refresh();
});

onBeforeUnmount(() => {
  appBar?.clearRefresh(refresh);
});

watch(windowHours, () => refresh());
</script>

<style scoped>
.border {
  border: 1px solid #e2e8f0;
}
.border-subtle {
  border: 1px solid #e2e8f0;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>

