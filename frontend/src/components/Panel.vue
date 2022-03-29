<script setup lang="ts">
import { settings } from '../admin-settings';

</script>

<template>
<div class="panel">
    <div class="amount-container input-container">
        <label for="amount">Amount</label>
        <input type="number" id="amount" name="amount" v-model="settings.amount">
        <div class="keep-container">
            <input type="checkbox" id="keepAmount" name="keepAmount" v-model="settings.keepAmount">
            <label for="keepAmount">Keep</label>
        </div>
    </div>
    <div class="date-container input-container">
        <label for="date">Date</label>
        <div class="date-inner-container">
            <input type="datetime-local" id="date" name="date" v-model="settings.date">
        </div>
        <div class="keep-container">
            <input type="checkbox" id="keepDate" name="keepDate" v-model="settings.keepDate">
            <label for="keepDate">Keep</label>
        </div>
    </div>
    <div class="owner-container input-container">
        <label for="owner">Owner</label>
        <input type="text" id="owner" name="owner" v-model="settings.owner">
        <div class="keep-container">
            <input type="checkbox" id="keepOwner" name="keepOwner" v-model="settings.keepOwner">
            <label for="keepOwner">Keep</label>
        </div>
    </div>
    <div class="reason-container input-container">
        <label for="reason">Reason</label>
        <input type="text" id="reason" name="reason" v-model="settings.reason">
        <div class="keep-container">
            <input type="checkbox" id="keepReason" name="keepReason" v-model="settings.keepReason">
            <label for="keepReason">Keep</label>
        </div>
    </div>
</div>
</template>

<style scoped lang="scss">
.panel {
  display: flex;
  flex-direction: row;
  width: calc(100% - 1rem);
  height: calc(15% - 1rem);
  padding: 0.5rem;
  margin: 0;
  border: none;

    .input-container {
        display: flex;
        flex-direction: column;
        width: 25%;
        padding: 0.5rem;
        font-size: 3vh;
        line-height: 3vh;

        label {
            margin-left: 0.5vh;
            font-weight: bold;
        }

        > * {
            margin-top: 1vh;
        }

        > *:first-child {
            margin-top: 0;
        }

        input {
            height: 2vh;
            font-size: 2vh;
            line-height: 2vh;
            width: 90%;
            padding: 0.5vh;
            margin: 0.5vh;
            margin-top: 1.5vh;
            border: solid 0.2vh rgb(179, 179, 179);
            border-radius: 2vh;
            box-shadow: 0 0.125rem 0.125rem rgba(0,0,0,0.3);

            &#date {
                margin: 0;
                margin-top: 0;
            }
        }

        .date-inner-container {
            margin: 0.5vh;
            margin-top: 1.5vh;
            padding: 0;
            border: none;
        }

        .keep-container {
            display: flex;
            flex-direction: row;

            label {
                font-size: 2.5vh;
                line-height: 2.5vh;
                margin-top: 0.5vh;
                font-weight: normal;
            }

            input {
                height: 2.5vh;
                width: 2.5vh;
                padding: 0.5vh;
                margin: 0.5vh;
                border: solid 0.2vh rgb(179, 179, 179);
                box-shadow: 0 0.125rem 0.125rem rgba(0,0,0,0.3);
            }
        }
    }
}

@media (max-aspect-ratio: 1/1) {
  .panel {
    padding: 0.125rem;
    width: calc(100% - 0.25rem);
    height: calc(15vw - 1rem);

    .input-container {
        padding: 0.1rem;
        font-size: 3vw;
        line-height: 3vw;

        label {
            margin-left: 0.5vw;
        }

        > * {
            margin-top: 1vw;
        }

        > *:first-child {
            margin-top: 0;
        }

        input {
            height: 2vw;
            font-size: 2vw;
            line-height: 2vw;
            padding: 0.5vw;
            margin: 0.5vw;
            margin-top: 1.5vw;
            border: solid 0.2vw rgb(179, 179, 179);
            border-radius: 2vw;

             &#date {
                margin: 0;
                margin-top: 0;
            }
        }

        .date-inner-container {
            margin: 0.5vw;
            margin-top: 1.5vw
        }

        .keep-container {
            label {
                font-size: 2.5vw;
                line-height: 2.5vw;
                margin-top: 0.5vw;
            }

            input {
                height: 2.5vw;
                width: 2.5vw;
                padding: 0.5vw;
                margin: 0.5vw;
                border: solid 0.2vw rgb(179, 179, 179);
            }
        }
    }
  }
}
</style>