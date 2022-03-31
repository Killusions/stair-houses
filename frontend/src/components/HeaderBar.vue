<template>
  <div class="header">
    <router-link to="/" class="header-container">
      <img src="../assets/stairwhite.png" class="logo" />
      <div class="title">Houses</div>
    </router-link>
  </div>
</template>

<style scoped lang="scss">
  .header {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 12%;
  }

  .header-container {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    color: unset;
    text-decoration: none;
  }

  .logo {
    margin-left: 3.5vh;
    margin-right: 3.5vh;
    height: 10vh;
    cursor: pointer;
  }

  .title {
    font-weight: bold;
    font-size: 9vh;
    line-height: 10vh;
  }

  @media (max-aspect-ratio: 1/1) {
    .header {
      height: 12vw;
    }

    .logo {
      margin-left: 1.75vw;
      margin-right: 1.75vw;
      height: 10vw;
    }

    .title {
      font-weight: bold;
      font-size: 9vw;
      line-height: 10vw;
    }
  }
</style>
