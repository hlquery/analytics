<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="5" lg="4">
      <v-card variant="flat" class="border">
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1 font-weight-bold">Sign in</span>
          <v-chip size="small" variant="tonal" color="primary">analytics</v-chip>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">
            {{ error }}
          </v-alert>

          <v-text-field v-model="username" label="Username" density="compact" variant="outlined" autofocus />
          <v-text-field
            v-model="password"
            label="Password"
            density="compact"
            variant="outlined"
            type="password"
            @keyup.enter="submit"
          />

          <div class="d-flex justify-end mt-2">
            <v-btn color="primary" :loading="loading" :disabled="loading" @click="submit">sign in</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchMe, login } from '@/auth';

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await login(username.value, password.value);
    const next = typeof route.query.next === 'string' ? route.query.next : '/';
    router.replace(next);
  } catch (e) {
    error.value = e?.response?.data?.message || 'Invalid username or password.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const me = await fetchMe();
  if (me.autologin || me.authenticated) {
    router.replace('/');
  }
});
</script>

<style scoped>
.border {
  border: 1px solid #e2e8f0;
}
</style>

