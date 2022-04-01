<script setup lang="ts">
  import Houses from '../components/Houses.vue'
  import Ranking from '../components/Ranking.vue'
  import { ranking } from '../settings'
</script>

<template>
  <Ranking v-if="ranking" :add-amount="0"> </Ranking>
  <Houses v-else :add-amount="0"> </Houses>
</template>
