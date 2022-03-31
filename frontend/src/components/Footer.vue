<script setup lang="ts">
  import { logOut } from '../data'
</script>

<template>
  <div class="footer">
    <a href="https://stair.ch/" class="subtitle footer-item"
      >Organised by STAIR</a
    >
    <router-link
      v-if="
        $router.currentRoute.value.path !== '/admin' &&
        $router.currentRoute.value.path !== '/login'
      "
      to="/admin"
      class="admin-link footer-item"
      >Admin-Panel</router-link
    >
    <router-link
      v-if="$router.currentRoute.value.path === '/admin'"
      to="/"
      class="admin-link footer-item"
      @click="logOut()"
      >Log out</router-link
    >
    <a href="https://linus.clckm.co/" class="madeby footer-item"
      >Webdesign by Linus</a
    >
  </div>
</template>

<style scoped lang="scss">
  .footer {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    height: 3%;
  }

  .footer-item {
    padding: 0.5% 1rem;
    font-weight: bold;
    font-size: 2vh;
    line-height: 3vh;
    color: unset;
    text-decoration: none;
  }

  .subtitle,
  .madeby {
    flex: 1;
  }

  .subtitle {
    text-align: left;
  }

  .admin-link {
    text-align: center;
  }

  .madeby {
    text-align: right;
  }

  @media (max-aspect-ratio: 1/1) {
    .footer {
      display: flex;
      height: 3vw;
    }

    .footer-item {
      padding: 0.5% 1rem;
      font-weight: bold;
      font-size: 2vw;
      line-height: 3vw;
    }
  }
</style>
