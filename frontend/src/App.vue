<script setup lang="ts">
import { ref } from 'vue';
import { subscribePoints, zeroData } from './data';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';

subscribePoints().subscribe(data => {
  if (data !== zeroData) {
    loading.value = false;
  }
});

subscribePoints().subscribe(data => {
  if (data !== zeroData) {
    loading.value = false;
  }
});

let loading = ref(true);
</script>

<template>
<div class="loading" v-bind:class="{hide: !loading || $router.currentRoute.value.path === '/login'}">
  Loading scores...
</div>
<div class="container">
  <Header>
  </Header>
  <router-view></router-view>
  <Footer>
  </Footer>
</div>
</template>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  background: rgb(17,17,17);
  background: linear-gradient(137deg, rgba(17,17,17,1) 0%, rgba(33,33,33,1) 50%, rgba(62,62,62,1) 100%);
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  padding: 0;
  margin: 0;
  border: none;
}

.loading {
  display:flex;
  flex-direction: column;
  justify-content: center;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  width: 100%;
  background: rgb(17,17,17);
  background: linear-gradient(137deg, rgba(17,17,17,1) 0%, rgba(33,33,33,1) 50%, rgba(62,62,62,1) 100%);
  font-size: 2rem;
  text-align: center;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  padding: 0;
  margin: 0;
  border: none;
  z-index: 100;
}

.loading.hide {
  display: none;
}
</style>
