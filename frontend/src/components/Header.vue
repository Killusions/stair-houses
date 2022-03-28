<template>
<div class="header">
<router-link to="/"><img src="../assets/stairwhite.png" class="logo"></router-link>
<div class="title">Houses</div>
</div>
</template>

<style scoped lang="scss">
.header {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-end;
  height: 12%;
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
    display: flex;
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
