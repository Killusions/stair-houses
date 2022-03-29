<script setup lang="ts">
import { BehaviorSubject } from 'rxjs';
import { ref } from 'vue';
import moment from 'moment';
import { settings } from '../admin-settings';
import { addPoints, DisplayData, getPoints, subscribePoints } from '../data';

const props = defineProps({ addAmount: { type: Number, default: 0 } });

const displayData: BehaviorSubject<DisplayData> = subscribePoints();

const displayActualData = ref(displayData.value);

displayData.subscribe(data => {
  displayActualData.value = data;
})

getPoints();

const addPointToColor = async (color: string) => {
  try {
    if (!!props.addAmount) {
        await addPoints(color, settings.value.amount, moment(settings.value.date).toDate(), settings.value.owner, settings.value.reason);
        if (!settings.value.keepAmount) {
            settings.value.amount = 1;
        }
        if (!settings.value.keepDate) {
            const currentDate = moment(new Date()).format('YYYY-MM-DDThh:mm');
            settings.value.date = currentDate;
        }
        if (!settings.value.keepOwner) {
            settings.value.owner = '';
        }
        if (!settings.value.keepReason) {
            settings.value.reason = '';
        }
    }
  } catch (e) {
    console.error(e);
  }
};
</script>

<template>
<div v-if="displayActualData" class="content" v-bind:class="{small: !!addAmount}">
    <div v-for="data in displayActualData" :key="data.color" class="house" v-bind:class="{[data.color]: true, clickable: !!addAmount}" @click="addPointToColor(data.color)">
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
</template>

<style scoped lang="scss">
.content {
  display: grid;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: 1fr 1fr 1fr;
  width: calc(100% - 1rem);
  height: calc(85% - 1rem);
  padding: 0.5rem;
  margin: 0;
  border: none;

  &.small {
    height: calc(70% - 1rem);
  }
}

@media (max-aspect-ratio: 1/1) {
  .content {
    height: calc(100% - 15vw - 1rem);

    &.small {
        height: calc(100% - 30vw - 1rem);
    }
  }
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
  transition: transform .2s ease-in-out;

  &.clickable {
    cursor: pointer;
  }

  &:hover {
    color: #e6e6e6;
    transform: scale(1.03);
  }
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
