<script setup lang="ts">
  import Panel from '../components/Panel.vue'
  import Houses from '../components/Houses.vue'
  import Ranking from '../components/Ranking.vue'
  import { ranking, secret } from '../settings'
  import { useRouter } from 'vue-router'
  import { authFailure, hasSessionId } from '../data'
  const router = useRouter()

  authFailure.subscribe(() => {
    router.push('/login')
  })

  if (!hasSessionId()) {
    router.push('/login')
  } else {
    secret.value = true
  }
</script>

<template>
  <Panel> </Panel>
  <Ranking v-if="ranking" :add-amount="0"> </Ranking>
  <Houses v-else :add-amount="0"> </Houses>
</template>
