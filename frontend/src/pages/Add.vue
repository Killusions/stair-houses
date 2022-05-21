<script setup lang="ts">
  import { useRouter } from 'vue-router';
  import {
    authFailure,
    checkSession,
    hasConfirmedCurrentUserSession,
    hasSetUserSession,
    hasUserSession,
  } from '../data';
  import { resetSettings, resetState } from '../settings';
  const router = useRouter();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    router.push('/login');
  });

  if (!hasUserSession()) {
    router.push('/admin');
  } else if (!hasSetUserSession()) {
    router.push('/login');
  } else if (!hasConfirmedCurrentUserSession()) {
    router.push('/login');
  } else {
    checkSession();
  }
</script>

<template>
  <div class="content-base add">
    <div class="addtitle">Add</div>
  </div>
</template>

<style scoped lang="scss">
  .add {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;

    .addtitle {
      display: flex;
      flex-direction: row;
      align-items: center;

      .icon {
        font-size: 1.5rem;
        cursor: pointer;
      }
    }
  }
</style>
