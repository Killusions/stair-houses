<script setup lang="ts">
  import {
    resetSettings,
    resetState,
    ranking,
    resetFilters,
  } from '../settings';
  import Houses from '../components/Houses.vue';
  import Ranking from '../components/Ranking.vue';
  import {
    authFailure,
    checkSession,
    hasSession,
    hasUserSession,
    isLoggingOut,
  } from '../data';
  import { useRouter } from 'vue-router';
  const router = useRouter();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    resetFilters();
  });

  if (!isLoggingOut() && hasSession()) {
    if (hasUserSession()) {
      router.push('/user');
    } else {
      router.push('/admin');
    }
  } else {
    checkSession(false, true);
  }
</script>

<template>
  <div class="page">
    <Ranking v-if="ranking" :allow-edit="false"></Ranking>
    <Houses v-else :allow-edit="false"> </Houses>
  </div>
</template>
