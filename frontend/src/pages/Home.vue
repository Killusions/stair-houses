<script setup lang="ts">
  import Houses from '../components/Houses.vue';
  import Ranking from '../components/Ranking.vue';
  import { ranking } from '../settings';
</script>

<template>
  <div class="page">
    <Ranking v-if="ranking" :allow-edit="false"> </Ranking>
    <Houses v-else :allow-edit="false"> </Houses>
  </div>
</template>
