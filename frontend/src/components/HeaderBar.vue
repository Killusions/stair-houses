<script setup lang="ts">
  import {
    loggedIn,
    userLoggedIn,
    userConfirmed,
    userCurrentConfirmed,
    userSet,
    ranking,
    secret,
    filters,
  } from '../settings';
  import { APP_NAME } from '../../../backend/src/constants';
  import { onUnmounted, ref } from 'vue';

  defineProps({ showFilterPanel: { type: Boolean, default: false } });

  let showModal = ref(false);

  const clickModal = () => {
    showModal.value = !showModal.value;
  };

  const eventListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      showModal.value = false;
    }
  };

  window.addEventListener('keyup', eventListener);

  onUnmounted(() => {
    window.removeEventListener('keyup', eventListener);
  });
</script>

<template>
  <div class="header">
    <router-link
      :to="loggedIn ? (userLoggedIn ? '/user' : '/admin') : '/'"
      class="header-container"
    >
      <img src="../assets/stairwhite.png" class="logo logo-big" />
      <img src="../assets/stairwhitesmall.png" class="logo logo-small" />
      <div class="title">{{ APP_NAME }}</div>
    </router-link>
    <div class="right-hand-buttons">
      <router-link
        v-if="
          $router.currentRoute.value.path === '/' &&
          !loggedIn &&
          !showFilterPanel
        "
        to="/login"
        class="view-toggle"
      >
        Log in
      </router-link>
      <router-link
        v-if="$router.currentRoute.value.path === '/' && loggedIn"
        :to="userLoggedIn ? '/user' : '/admin'"
        class="view-toggle"
      >
        {{ userLoggedIn ? 'User menu' : 'Admin panel' }}
      </router-link>
      <router-link
        v-if="
          ($router.currentRoute.value.path === '/login' ||
            $router.currentRoute.value.path === '/user') &&
          userLoggedIn &&
          userSet &&
          !userConfirmed &&
          !showFilterPanel
        "
        to="/stateinfo"
        class="view-toggle"
      >
        Configure
      </router-link>
      <router-link
        v-if="
          $router.currentRoute.value.path === '/stateinfo' && !userConfirmed
        "
        to="/login"
        class="view-toggle"
      >
        Account
      </router-link>
      <router-link
        v-if="
          ($router.currentRoute.value.path === '/plans' ||
            $router.currentRoute.value.path === '/add' ||
            $router.currentRoute.value.path === '/login' ||
            $router.currentRoute.value.path === '/stateinfo') &&
          userSet
        "
        to="/user"
        class="view-toggle"
      >
        Scores
      </router-link>
      <router-link
        v-if="
          ($router.currentRoute.value.path === '/user' ||
            $router.currentRoute.value.path === '/plans' ||
            $router.currentRoute.value.path === '/login' ||
            $router.currentRoute.value.path === '/stateinfo') &&
          userCurrentConfirmed &&
          !showFilterPanel
        "
        to="/add"
        class="view-toggle"
      >
        Add
      </router-link>
      <button
        v-if="
          $router.currentRoute.value.path === '/' ||
          ($router.currentRoute.value.path === '/user' && secret) ||
          $router.currentRoute.value.path === '/admin'
        "
        class="view-toggle"
        @click="ranking = !ranking"
      >
        {{ ranking ? 'Ranking' : 'Overview' }}
      </button>
      <button
        v-if="showFilterPanel"
        class="showModal-button"
        :class="{
          warning:
            (filters.dateStart && !filters.dateStartParsed) ||
            (filters.dateEnd && !filters.dateEndParsed) ||
            (filters.dateStartParsed &&
              filters.dateEndParsed &&
              filters.dateStartParsed.getTime() >
                filters.dateEndParsed.getTime()),
        }"
        @click="clickModal()"
      >
        Filters
        <span class="icon icon-pencil"></span>
      </button>
    </div>
    <Transition v-if="showFilterPanel" name="modal">
      <div v-if="showModal" class="modal-mask">
        <div class="modal-wrapper">
          <div class="modal-container">
            <div class="modal-header">
              <slot name="header">Search Settings</slot>
            </div>
            <div class="modal-body">
              <div class="date-start-container input-container">
                <label for="date-start"
                  >Date from{{
                    filters.dateStart && !filters.dateStartParsed
                      ? ': Please enter a valid date'
                      : ''
                  }}</label
                >
                <div class="date-inner-container">
                  <input
                    id="date-start"
                    v-model="filters.dateStart"
                    type="date"
                    name="date-start"
                    placeholder="Date"
                    :class="{
                      warning: filters.dateStart && !filters.dateStartParsed,
                    }"
                  />
                </div>
              </div>
              <div class="date-end-container input-container">
                <label for="date-end"
                  >Date to{{
                    filters.dateEnd && !filters.dateEndParsed
                      ? ': Please enter a valid date'
                      : filters.dateStartParsed &&
                        filters.dateEndParsed &&
                        filters.dateStartParsed.getTime() >
                          filters.dateEndParsed.getTime()
                      ? ': The end date needs to be before the start date'
                      : ''
                  }}</label
                >
                <div class="date-inner-container">
                  <input
                    id="date-end"
                    v-model="filters.dateEnd"
                    type="date"
                    name="date-end"
                    placeholder="Date"
                    :class="{
                      warning:
                        (filters.dateEnd && !filters.dateEndParsed) ||
                        (filters.dateStartParsed &&
                          filters.dateEndParsed &&
                          filters.dateStartParsed.getTime() >
                            filters.dateEndParsed.getTime()),
                    }"
                  />
                </div>
              </div>
              <div class="reason-container input-container">
                <label for="reason">Reason</label>
                <input
                  id="reason"
                  v-model="filters.reason"
                  type="text"
                  name="reason"
                  placeholder="General"
                  maxlength="1000"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="modal-default-button" @click="clickModal()">
                <span class="icon button-icon icon-cancel"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
  .showModal-button {
    margin: 0;
    min-height: 2.1rem;
    height: min-content;
    font-size: 1rem;
    line-height: 1.5rem;
    font-weight: bold;
    padding: 0.15rem;
    padding-left: 0.45rem;
    padding-right: 0.45rem;
    background-color: #ffffff;
    border: solid 0.1rem rgb(179, 179, 179);
    border-radius: 1rem;
    box-shadow: 0 0.125rem 0.125rem rgba(0, 0, 0, 0.3);
    text-decoration: none;
    color: #000000;

    &.warning {
      border: solid 0.3vh rgb(194, 0, 0);
      border: solid calc((0.3 * (100vh - var(--vh-offset, 0px)) / 100))
        rgb(194, 0, 0);
    }
  }
  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.5);
    transition: opacity 0.3s ease;
  }

  .modal-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .modal-container {
    max-height: 80%;
    width: 70%;
    padding: 1rem;
    background-color: rgb(126, 126, 126);
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
    transition: all 0.3s ease;
    overflow-y: auto;
    border: 0.125rem solid rgb(179, 179, 179);
  }

  .modal-header {
    font-size: 2rem;
  }

  .modal-body {
    margin: 20px 0;
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: 1fr 1fr;
    justify-items: center;
    align-items: center;
  }

  .modal-default-button {
    float: right;
    height: 2.1rem;
    font-size: 1rem;
    line-height: 1rem;
    font-weight: bold;
    padding: 0;
    background-color: #ffffff;
    border: solid 0.1rem rgb(179, 179, 179);
    border-radius: 1rem;
    box-shadow: 0 0.125rem 0.125rem rgba(0, 0, 0, 0.3);
    text-decoration: none;
    color: #000000;
  }

  .modal-enter-from {
    opacity: 0;
  }

  .modal-leave-to {
    opacity: 0;
  }

  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
  }

  .input-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 90%;
    padding: 0.5rem;
    font-size: 1.25rem;
    line-height: 1.25rem;

    label {
      margin-left: 0.5vh;
      margin-left: calc((0.5 * (100vh - var(--vh-offset, 0px)) / 100));
      font-weight: bold;
    }

    > * {
      margin-top: 1vh;
      margin-top: calc((1 * (100vh - var(--vh-offset, 0px)) / 100));
    }

    > *:first-child {
      margin-top: 0;
    }

    input {
      font-family: Arial, Helvetica, sans-serif;
      height: 1rem;
      font-size: 1rem;
      line-height: 1rem;
      width: 90%;
      padding: 0.5rem;
      margin: 0.5vh;
      margin: calc((0.5 * (100vh - var(--vh-offset, 0px)) / 100));
      margin-top: 1.5vh;
      margin-top: calc((1.5 * (100vh - var(--vh-offset, 0px)) / 100));
      border: solid 0.2vh rgb(179, 179, 179);
      border: solid calc((0.2 * (100vh - var(--vh-offset, 0px)) / 100))
        rgb(179, 179, 179);
      border-radius: 2vh;
      border-radius: calc((2 * (100vh - var(--vh-offset, 0px)) / 100));
      box-shadow: 0 0.125rem 0.125rem rgba(0, 0, 0, 0.3);

      &.warning {
        border: solid 0.3vh rgb(194, 0, 0);
        border: solid calc((0.3 * (100vh - var(--vh-offset, 0px)) / 100))
          rgb(194, 0, 0);
      }

      &.date {
        margin: 0;
        margin-top: 0;
      }
    }

    .date-inner-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin: 0.5vh;
      margin: calc((0.5 * (100vh - var(--vh-offset, 0px)) / 100));
      margin-top: 1.5vh;
      margin-top: calc((1.5 * (100vh - var(--vh-offset, 0px)) / 100));
      padding: 0;
      border: none;
    }
  }
  .header {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    height: 12vh;
    height: calc((12 * (100vh - var(--vh-offset, 0px)) / 100));
  }

  .header-container {
    width: min-content;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    color: unset;
    text-decoration: none;
  }

  .right-hand-buttons {
    display: flex;
    flex-direction: row;
  }

  .logo {
    margin-left: 3.5vh;
    margin-left: calc((3.5 * (100vh - var(--vh-offset, 0px)) / 100));
    margin-right: 3.5vh;
    margin-right: calc((3.5 * (100vh - var(--vh-offset, 0px)) / 100));
    height: 8vh;
    height: calc((8 * (100vh - var(--vh-offset, 0px)) / 100));
    cursor: pointer;

    &.logo-small {
      display: none;
    }
  }

  .title {
    font-weight: bold;
    font-size: 7.2vh;
    font-size: calc((7.2 * (100vh - var(--vh-offset, 0px)) / 100));
    line-height: 10vh;
    line-height: calc((10 * (100vh - var(--vh-offset, 0px)) / 100));
  }

  .view-toggle {
    display: block;
    box-sizing: border-box;
    margin-left: auto;
    margin-right: 0.75rem;
    margin-top: 0;
    margin-bottom: 0.6rem;
    height: 2.1rem;
    font-size: 1rem;
    line-height: 1rem;
    font-weight: bold;
    padding: 0.45rem;
    background-color: #ffffff;
    border: solid 0.1rem rgb(179, 179, 179);
    border-radius: 1rem;
    box-shadow: 0 0.125rem 0.125rem rgba(0, 0, 0, 0.3);
    text-decoration: none;
    color: #000000;
  }

  @media (min-aspect-ratio: 3/1) {
    .header {
      height: 16vh;
      height: calc((16 * (100vh - var(--vh-offset, 0px)) / 100));
    }

    .logo {
      margin-left: 2.333vh;
      margin-left: calc((2.333 * (100vh - var(--vh-offset, 0px)) / 100));
      margin-right: 2.333vh;
      margin-right: calc((2.333 * (100vh - var(--vh-offset, 0px)) / 100));
      height: 10.666vh;
      height: calc((10.666 * (100vh - var(--vh-offset, 0px)) / 100));
    }

    .title {
      font-size: 9.6vh;
      font-size: calc((9.6 * (100vh - var(--vh-offset, 0px)) / 100));
      line-height: 13.333vh;
      line-height: calc((13.333 * (100vh - var(--vh-offset, 0px)) / 100));
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .modal-body {
      grid-template-rows: 1fr 1fr 1fr;
      grid-template-columns: 1fr;
    }

    .input-container {
      padding: 0.6rem;

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
        font-family: Arial, Helvetica, sans-serif;
        margin: 0.5vw;
        margin-top: 1.5vw;
        border: solid 0.2vw rgb(179, 179, 179);
        border-radius: 2vw;

        &.warning {
          border: solid 0.3vw rgb(194, 0, 0);
        }
      }

      .date-inner-container {
        margin: 0.5vw;
        margin-top: 1.5vw;
      }
    }
    .header {
      height: 12vw;
    }

    .logo {
      margin-left: 1.75vw;
      margin-right: 1.75vw;
      height: 8vw;
    }

    .title {
      font-size: 7.2vw;
      line-height: 10vw;
    }

    .view-toggle {
      height: 1.7rem;
      font-size: 0.8rem;
      line-height: 0.8rem;
      padding: 0.35rem;
    }
  }

  @media (max-aspect-ratio: 9/16) {
    .header {
      height: 16vw;
    }

    .logo {
      margin-left: 2.333vw;
      margin-right: 2.333vw;
      height: 10.666vw;

      &.logo-small {
        display: block;
      }

      &.logo-big {
        display: none;
      }
    }

    .title {
      font-size: 9.6vw;
      line-height: 13.333vw;
    }
  }
</style>
