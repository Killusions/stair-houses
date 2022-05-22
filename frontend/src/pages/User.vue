<script setup lang="ts">
  import Houses from '../components/Houses.vue';
  import Ranking from '../components/Ranking.vue';
  import {
    resetSettings,
    ranking,
    resetState,
    resetFilters,
  } from '../settings';
  import { useRouter } from 'vue-router';
  import {
    authFailure,
    checkSession,
    hasSetUserSession,
    hasUserSession,
  } from '../data';
  const router = useRouter();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    resetFilters();
    router.push('/login');
  });

  if (!hasUserSession()) {
    router.push('/admin');
  } else if (!hasSetUserSession()) {
    router.push('/login');
  } else {
    checkSession();
  }
</script>

<template>
  <div class="page">
    <Ranking v-if="ranking" :allow-edit="false"></Ranking>
    <Houses v-else :small="true" :allow-edit="false"> </Houses>
  </div>
</template>
