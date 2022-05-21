<script setup lang="ts">
  import { useRouter } from 'vue-router';
  import {
    authFailure,
    checkSession,
    getUserInfo,
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
  } else {
    checkSession();
  }

  (async () => {
    try {
      const result = await getUserInfo();
      if (result) {
        if (result.houseConfirmed) {
          alert('You are in the ' + result.houseConfirmed + ' house.');
        } else {
          alert('Your house is not confirmed, please contact us.');
        }
      }
    } catch (e: unknown) {
      console.error(e);
      throw e;
    }
  })();
</script>

<template>
  <div class="content-base stateinfo">
    <div class="statetitle">State Info</div>
  </div>
</template>

<style scoped lang="scss">
  .stateinfo {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;

    .statetitle {
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
