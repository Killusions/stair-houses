<script setup lang="ts">
  import Panel from '../components/Panel.vue';
  import Houses from '../components/Houses.vue';
  import Ranking from '../components/Ranking.vue';
  import {
    ranking,
    resetFilters,
    resetSettings,
    resetState,
  } from '../settings';
  import { useRouter } from 'vue-router';
  import { authFailure, checkSession } from '../data';
  const router = useRouter();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    resetFilters();
    router.push('/login');
  });

  checkSession(true);
</script>

<template>
  <div class="page">
    <Panel v-if="!ranking"> </Panel>
    <Ranking v-if="ranking" :allow-edit="!ranking"> </Ranking>
    <Houses v-else :allow-edit="!ranking"> </Houses>
  </div>
</template>
