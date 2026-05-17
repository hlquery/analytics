<template>
  <v-row>
    <v-col cols="12">
      <v-card variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">App Users</span>
          <div />
        </v-card-title>
        <v-card-text>
          <v-alert v-if="authState.autologin" type="info" variant="tonal" density="compact" class="mb-3">
            User management is disabled when <span class="font-mono">AUTOLOGIN=1</span>.
          </v-alert>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">
            {{ error }}
          </v-alert>

          <v-row dense class="mb-2">
            <v-col cols="12" md="4">
              <v-text-field v-model="form.username" label="Username" density="compact" variant="outlined" :disabled="authState.autologin" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="form.password"
                label="Password"
                density="compact"
                variant="outlined"
                type="password"
                :disabled="authState.autologin"
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-select v-model="form.role" :items="roleChoices" label="Role" density="compact" variant="outlined" :disabled="authState.autologin" />
            </v-col>
            <v-col cols="12" md="2" class="d-flex align-center justify-end">
              <v-btn color="primary" variant="tonal" :loading="creating" :disabled="creating || authState.autologin" @click="createUser">
                create
              </v-btn>
            </v-col>
          </v-row>

          <v-data-table
            :headers="headers"
            :items="users"
            :loading="loading"
            density="comfortable"
            :items-per-page="25"
          >
            <template #item.createdAt="{ value }">
              <span class="font-mono text-medium-emphasis">{{ formatIso(value) }}</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { authState, fetchMe } from '@/auth';
import { api } from '@/api';

const appBar = inject('analyticsAppBar', null);

const headers = [
  { title: 'At', key: 'createdAt', sortable: true },
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
];

const users = ref([]);
const loading = ref(false);
const creating = ref(false);
const error = ref('');

const roleChoices = [
  { title: 'User', value: 'user' },
  { title: 'Admin', value: 'admin' },
];

const form = reactive({
  username: '',
  password: '',
  role: 'user',
});

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
    const { data } = await api.get('/api/admin/users');
    users.value = data.users || [];
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to load users.';
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  creating.value = true;
  error.value = '';
  try {
    await api.post('/api/admin/users', { username: form.username, password: form.password, role: form.role });
    form.password = '';
    await refresh();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to create user.';
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  await fetchMe();
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

