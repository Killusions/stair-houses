<script setup lang="ts">
  import { BehaviorSubject } from 'rxjs'
  import { ref } from 'vue'
  import { DisplayData, getPoints, subscribePoints } from '../data'

  const displayData: BehaviorSubject<DisplayData> = subscribePoints()

  const showColors = ref(true)

  const displayActualData = ref(displayData.value)

  displayData.subscribe((data) => {
    displayActualData.value = data
  })

  getPoints()
</script>

<template>
  <div class="ranking">
    <div class="ranking-image"></div>
    <div class="ranking-content">
      <div class="subheader">SCOREBOARD</div>
      <div v-if="displayActualData" class="content">
        <div
          v-for="(data, index) in displayActualData"
          :key="data.color"
          class="house"
        >
          <span class="index"> {{ index + 1 }}. </span>
          <span class="name" :class="{ [data.color]: showColors }">
            {{ (data.colorString + ' House').toUpperCase() }}
          </span>
          <span class="number">
            {{ data.points }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .ranking {
    position: relative;
    width: calc(100% - 2rem);
    height: calc(85% - 2rem);
    padding: 1rem;
    margin: 0;
    border: none;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
  }

  .ranking-image {
    position: absolute;
    top: 1rem;
    left: 1rem;
    padding: 0;
    margin: 0;
    height: calc(100% - 2rem);
    width: 0;
    padding-right: calc(100% - 2rem);
    border: none;
    background-image: url('../assets/stairscoreboard.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 50% 50%;
    object-fit: contain;
  }

  .ranking-content {
    width: calc(76.4vh);
    padding: 2vh;
    margin: 0;
    border: none;
    color: #000000;
    font-size: 4.5vh;
    line-height: 4vh;
    z-index: 100;
  }

  .subheader {
    text-align: center;
    font-size: 9vh;
    line-height: 9vh;
    margin: 0;
    margin-top: 13vh;
    margin-bottom: 5vh;
  }

  .house {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 1.25vh;
    margin: 0 5vh;
    font-weight: bold;
    transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;

    &:hover {
      border-radius: 0.5vh;
      box-shadow: 0 0.5vh 0.5vh rgba(0, 0, 0, 0.3);
      background-color: rgba(223, 223, 223, 0.5);
      transform: scale(1.03);
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .ranking {
      height: calc(100% - 15vw - 2rem);
      display: block;
    }
  }

  @media (min-aspect-ratio: 7/8) and (max-aspect-ratio: 1/1) {
    .ranking {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: flex-start;
    }
  }

  @media (max-aspect-ratio: 7/8) {
    .ranking-image {
      height: 0;
      width: calc(100% - 2rem);
      padding-bottom: calc(100% - 2rem);
      padding-right: 0;
    }

    .ranking-content {
      width: 95%;
      padding: 2vw * 1.175;
      position: relative;
      top: 0;
      left: 0;
      right: 0;
      font-size: 4.5vw * 1.175;
      line-height: 4vw * 1.175;
    }

    .house {
      padding: 1.25vw * 1.175;
      margin: 0 5vw * 1.175;

      &:hover {
        border-radius: 0.5vw * 1.175;
        box-shadow: 0 0.5vw * 1.175 0.5vw * 1.175 rgba(0, 0, 0, 0.3);
      }
    }

    .subheader {
      font-size: 9vw * 1.1755;
      line-height: 9vw * 1.175;
      margin-top: 13vw * 1.175;
      margin-bottom: 5vw * 1.175;
    }
  }

  .red {
    color: #ab0200;
  }

  .blue {
    color: #166cc2;
  }

  .purple {
    color: #420082;
  }

  .grey {
    color: #808184;
  }

  .orange {
    color: #ff6228;
  }

  .yellow {
    color: #f6aa00;
  }

  .warning-message {
    opacity: 1;
    transition: opacity 0.3s ease-in-out;

    &.hide {
      opacity: 0;
    }
  }
</style>
