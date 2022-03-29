<script setup lang="ts">
import Panel from '../components/Panel.vue';
import Houses from '../components/Houses.vue';
import { useRouter } from 'vue-router';
import { authFailure, hasSessionId } from '../data';
const router = useRouter();

authFailure.subscribe(() => {
    router.push('/login');
});

if (!hasSessionId()) {
    router.push('/login');
}

</script>

<template>
<Panel>
</Panel>
<Houses :addAmount="1">
</Houses>
</template>

<style scoped lang="scss">
</style>
