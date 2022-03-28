<template>
<div class="footer">
<div class="subtitle footer-item">Organised by STAIR</div>
<router-link v-if="$router.currentRoute.value.path !== '/admin'" to="/admin" class="admin-link footer-item">Admin-Panel</router-link>
<div class="madeby footer-item">Webdesign by Linus Schlumberger</div>
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
}

.subtitle,
.madeby {
  flex: 1;
}

.footer-item {
  font-weight: bold;
  font-size: 2vh;
  line-height: 3vh;
}

.subtitle {
  text-align: left;
}

.admin-link {
  color: unset;
  text-decoration: none;
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

  .subtitle {
    font-weight: bold;
    font-size: 2vw;
    line-height: 3vw;
  }
}
</style>
