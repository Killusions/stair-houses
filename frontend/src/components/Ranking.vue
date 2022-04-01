<script setup lang="ts">
  import { BehaviorSubject } from 'rxjs'
  import { ref } from 'vue'
  import moment from 'moment'
  import { settings } from '../settings'
  import { addPoints, DisplayData, getPoints, subscribePoints } from '../data'

  const props = defineProps({ allowEdit: { type: Boolean, default: false } })

  const displayData: BehaviorSubject<DisplayData> = subscribePoints()

  const showColors = ref(true)

  const displayActualData = ref(displayData.value)

  displayData.subscribe((data) => {
    displayActualData.value = data
  })

  const pressedColor = ref('red')

  const errorMessage = ref('')
  const displayErrorMessage = ref(false)

  getPoints()

  const addPointToColor = async (color: string) => {
    try {
      if (!!props.allowEdit) {
        if (
          !settings.value.amount ||
          isNaN(settings.value.amount) ||
          typeof settings.value.amount !== 'number'
        ) {
          if (!displayErrorMessage.value) {
            setTimeout(() => (displayErrorMessage.value = true))
          }
          errorMessage.value = 'Please enter a valid amount.'
        } else if (
          !settings.value.date ||
          isNaN(moment(settings.value.date).toDate().getTime())
        ) {
          if (!displayErrorMessage.value) {
            setTimeout(() => (displayErrorMessage.value = true))
          }
          errorMessage.value = 'Please enter a valid date.'
        } else if (
          !settings.value.reason &&
          (errorMessage.value !==
            'Please enter a reason. Press again to send anyway.' ||
            pressedColor.value !== color)
        ) {
          if (!displayErrorMessage.value) {
            setTimeout(() => (displayErrorMessage.value = true))
          }
          errorMessage.value =
            'Please enter a reason. Press again to send anyway.'
        } else {
          if (displayErrorMessage.value) {
            displayErrorMessage.value = false
            setTimeout(() => (errorMessage.value = ''))
          }
          await addPoints(
            color,
            settings.value.amount || 0,
            settings.value.date
              ? moment(settings.value.date).toDate()
              : undefined,
            settings.value.owner,
            settings.value.reason
          )
          if (!settings.value.keepAmount) {
            settings.value.amount = 1
          }
          if (!settings.value.keepDate) {
            const currentDate = moment(new Date()).format('YYYY-MM-DDThh:mm')
            settings.value.date = currentDate
          }
          if (!settings.value.keepOwner) {
            settings.value.owner = ''
          }
          if (!settings.value.keepReason) {
            settings.value.reason = ''
          }
        }
        pressedColor.value = color
      }
    } catch (e) {
      console.error(e)
    }
  }
</script>

<template>
  <div class="ranking" :class="{ small: !!allowEdit }">
    <div class="ranking-image"></div>
    <div class="ranking-content">
      <div class="subheader">SCOREBOARD</div>
      <div v-if="displayActualData" class="content">
        <div
          v-for="(data, index) in displayActualData"
          :key="data.color"
          class="house"
          :class="{ clickable: !!allowEdit }"
          @click="addPointToColor(data.color)"
        >
          <span class="index"> {{ index + 1 }}. </span>
          <div class="name" :class="{ [data.color]: showColors }">
            {{ (data.colorString + ' House').toUpperCase() }}
            <span
              v-if="errorMessage"
              class="warning-message"
              :class="{
                hide: !displayErrorMessage || pressedColor !== data.color,
              }"
            >
              {{ errorMessage }}
            </span>
          </div>
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

    &.small {
      height: calc(70% - 2rem);
    }
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
    &.clickable {
      cursor: pointer;
    }

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

      &.small {
        height: calc(100% - 28vw - 2rem);
      }
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
