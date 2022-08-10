<script setup lang="ts">
  import { useRouter } from 'vue-router';
  import { authFailure, checkSession, redeemPath } from '../data';
  import { resetFilters, resetSettings, resetState } from '../settings';
  import QrcodeVue from 'qrcode.vue';
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
  <div class="content-base codes">
    <div class="codestitle">Codes</div>
    <QrcodeVue :value="redeemPath + 'testtesttesttesttest'"></QrcodeVue>
  </div>
</template>

<style scoped lang="scss">
  .codes {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;

    .codestitle {
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
