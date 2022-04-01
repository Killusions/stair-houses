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
  <Panel v-if="!ranking"> </Panel>
  <Ranking v-if="ranking" :allow-edit="!ranking"> </Ranking>
  <Houses v-else :allow-edit="!ranking"> </Houses>
</template>
