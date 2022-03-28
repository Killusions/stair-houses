<script setup lang="ts">
import type { AppRouter } from '../../backend/dist/router';
import { createTRPCClient } from '@trpc/client';

const client = createTRPCClient<AppRouter>({
  url: 'http://localhost:3030/trpc',
});

(async () => {
  const user = await client.mutation('createUser', { name: 'hans', bio: 'dfasdf' });
  console.log(user);

  const userAgain = await client.query('getUserById', user.id);
  console.log(userAgain);
})();

const data = {
  red: 0,
  blue: 0,
  purple: 0,
  grey: 0,
  orange: 0,
  yellow: 0
};

const placesStrings = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th'
];

const lastString = '';

const scale = 2.1;

const highestPoints = Math.max(...Object.values(data));

const pointsMaxIndex = scale * highestPoints;

let loading = true;

const dataNormalizedArray: [string, number, number][] = Object.keys(data).map(key => [key, data[key as keyof typeof data] / pointsMaxIndex, data[key as keyof typeof data]]);

const randomOrder: {[key: string]: number} = {};

dataNormalizedArray.sort((a, b) => {
if (a[1] < b[1]) {
  return 1;
}
if (a[1] > b[1]) {
  return -1;
}
const previousRandom = randomOrder[a[0] + '-' + b[0]];
if (previousRandom) {
  console.log('previous random');
  return 0;
} else {
  const random = Math.random();
  randomOrder[a[0] + '-' + b[0]] = random;
  if (random < 0.5) {
    return 1;
  } else {
    return -1;
  }
}
});

let previousScore = -1;
let previousPlaceString = '';

const displayData: { color: string, colorString: string, points: number, relativePercentage: number, badgeString: string, badgeClass?: string }[] = dataNormalizedArray.map((item, index) => {
  let badgeString = '';
  let badgeClass = '';
  if (item[2] === previousScore) {
        badgeString = previousPlaceString;
      } else {
        if (lastString && (item[2] === 0 || index === dataNormalizedArray.length - 1 || !dataNormalizedArray.slice(index).find(searchItem => searchItem[2] < item[2]))) {
          previousPlaceString = lastString;
        } else {
          previousPlaceString = placesStrings[index] ?? '';
        }
        badgeString = previousPlaceString;
        previousScore = item[2];
      }
      
      if (placesStrings[0] === previousPlaceString) {
        badgeClass = 'first';
      } else if (placesStrings[1] === previousPlaceString) {
        badgeClass = 'second';
      } else if (placesStrings[2] === previousPlaceString) {
        badgeClass = 'third';
      } else if (lastString && lastString === previousPlaceString) {
        badgeClass = 'last';
      }
  return { color: item[0], colorString: item[0].charAt(0).toUpperCase() + item[0].slice(1), points: item[2], relativePercentage: item[1] * 100, badgeString, badgeClass };
});

loading = false;
</script>

<template>
<div v-if="loading" class="loading">
  Loading scores...
</div>
<div class="container">
  <div class="header">
    <img src="./assets/stairwhite.png" @click="window.location.replace('/')" class="logo">
    <div class="title">Houses</div>
  </div>
  <div v-if="displayData" class="content">
    <div v-for="data in displayData" :key="data.color" class="house" v-bind:class="[data.color]">
      <div class="points" v-bind:style="{ height: data.relativePercentage + '%' }">
      </div>
      <div class="name">
        {{data.colorString}}
        <div class="score">
          <span class="number">
            {{data.points}}
          </span>
          <span class="badge" v-bind:class="[data.badgeClass]">
            {{data.badgeString}}
          </span>
        </div>
      </div>
    </div>
  </div>
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

.content {
  display: grid;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
  width: calc(100% - 1rem);
  height: calc(88% - 1rem);
  padding: 0.5rem;
  margin: 0;
  border: none;
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
  
  .content {
    height: calc(100% - 12vw - 1rem);
  }
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
}

.loading.hide {
  display: none;
}

@media (min-aspect-ratio: 7/2) {
  .content {
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-areas: "a b c d e f";
  }
}

@media (max-aspect-ratio: 1/1) {
  .content {
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "a b" "c d" "e f";
  }
}

@media (max-aspect-ratio: 4/9) {
  .content {
    grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-columns: 1fr;
    grid-template-areas: "a" "b" "c" "d" "e" "f";
  }
}

.house {
  position: relative;
  background-color: black;
  height: auto;
  width: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0.5rem;
  border: 0.025rem solid rgba(0,0,0,0.25);
  border-radius: 1rem;
  box-shadow: 0 1rem 1rem rgba(0,0,0,0.3);
}

.red {
  background-color: #AB0200;
}

.blue {
  background-color: #166CC2;
}

.purple {
  background-color: #420082;
}

.grey {
  background-color: #808184;
}

.orange {
  background-color: #FF6228;
}

.yellow {
  background-color: #F6AA00;
}

.points {
  position: absolute;
  background-color: #D3D3D3;
  opacity: 0.35;
  height: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 0 0 1rem 1rem;
}

.name, .score {
  text-align: center;
  padding: 0;
  margin: 0;
  border: none;
}

.name {
  margin-left: 5%;
  margin-right: 5%;
  font-weight: normal;
  font-size: 2rem;
}

.score {
  margin-top: 0.25rem;
  font-weight: bold;
  font-size: 1.5rem;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.badge {
  background-color: #606060;
  padding: 0.25rem;
  font-size: 0.7rem;
  line-height: 1rem;
  border-radius: 0.6rem;
  margin: 0.1rem;
  margin-left: 0.35rem;
  border: none;
  box-shadow: 0 0.125rem 0.125rem rgba(0,0,0,0.3);
}

.badge.first {
  background-color: #FFD700;
  color: #0f0f0f;
}

.badge.second {
  background-color: #C0C0C0;
  color: #0f0f0f;
}

.badge.third {
  background-color: #cd7f32;
  color: #0f0f0f;
}

.badge.last {
  background-color: #871010;
}
</style>
