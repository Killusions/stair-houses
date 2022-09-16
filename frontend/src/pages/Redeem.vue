<script setup lang="ts">
  import { useRoute, useRouter } from 'vue-router';
  import {
    authFailure,
    checkSessionAsync,
    getCode,
    getConfirmedUserSessionHouse,
    hasConfirmedUserSession,
    hasSetUserSession,
    hasUserSession,
    redeemCode,
    redeemPath,
  } from '../data';
  import { resetFilters, resetSettings, resetState } from '../settings';
  import QrScanner from 'qr-scanner';
  import { onUnmounted, reactive, ref, watch } from 'vue';
  import { COLORS } from '../../../backend/src/constants';
  import moment from 'moment';
  const router = useRouter();

  authFailure.subscribe(() => {
    resetState();
    resetSettings();
    resetFilters();
    router.push('/login');
  });

  const qrScannerElement = ref<HTMLVideoElement>();
  let qrScanner: QrScanner;
  const startingScanning = ref(false);
  const scanning = ref(false);
  const showEnterPrompt = ref(true);
  const setCode = ref('');
  const codeMessage = ref('');
  const devices = ref<MediaDeviceInfo[]>();
  const currentDevice = ref<string>();
  let skipNextEvent = false;
  let ignoreNextChange = false;

  const route = useRoute();

  const showModal = ref(false);

  const modalSettings = reactive({
    displayReason: '',
    amount: 1,
    allowSettingAmount: false,
    date: '',
    allowSettingDate: false,
    dateParsed: null as Date | null,
    house: '' as keyof typeof COLORS | '',
    allowSettingHouse: false,
    owner: '',
    allowSettingOwner: false,
    reason: '',
    allowSettingReason: false,
  });

  const resetModalSettings = (
    displayReason = '',
    amount = 1,
    allowSettingAmount = false,
    date = new Date(),
    allowSettingDate = false,
    house = '' as keyof typeof COLORS | '',
    allowSettingHouse = false,
    owner = '',
    allowSettingOwner = false,
    allowSettingReason = false
  ) => {
    ignoreNextChange = true;
    modalSettings.displayReason = displayReason;
    modalSettings.amount = amount;
    modalSettings.allowSettingAmount = allowSettingAmount;
    modalSettings.date = moment(date).format('YYYY-MM-DDTHH:mm');
    modalSettings.allowSettingDate = allowSettingDate;
    modalSettings.dateParsed = date;
    modalSettings.house = house;
    modalSettings.allowSettingHouse = allowSettingHouse;
    modalSettings.owner = owner;
    modalSettings.allowSettingOwner = allowSettingOwner;
    modalSettings.reason = '';
    modalSettings.allowSettingReason = allowSettingReason;
  };

  let modalCloseCallback: ((confirm: boolean) => void) | undefined;

  const openModal = () => {
    showModal.value = true;
  };

  const openModalAndWait = (
    displayReason = '',
    amount = 1,
    allowSettingAmount = false,
    date = new Date(),
    allowSettingDate = false,
    house = '' as keyof typeof COLORS | '',
    allowSettingHouse = false,
    owner = '',
    allowSettingOwner = false,
    allowSettingReason = false
  ) =>
    new Promise<boolean>((resolve) => {
      resetModalSettings(
        displayReason,
        amount,
        allowSettingAmount,
        date,
        allowSettingDate,
        house,
        allowSettingHouse,
        owner,
        allowSettingOwner,
        allowSettingReason
      );
      modalCloseCallback = (confirm: boolean) => {
        modalCloseCallback = undefined;
        resolve(confirm);
      };
      openModal();
    });

  const closeModal = (confirm = false) => {
    showModal.value = false;
    if (modalCloseCallback) {
      modalCloseCallback(true);
      if (!confirm) {
        resetModalSettings();
      }
    } else {
      resetModalSettings();
    }
  };

  const validateModal = () => {
    if (
      showModal.value &&
      modalSettings.amount &&
      modalSettings.dateParsed &&
      modalSettings.house
    ) {
      closeModal(true);
    }
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

  if (route.params.code) {
    const code = route.params.code;
    if (
      typeof code === 'string' &&
      code.length === 20 &&
      code.match(/^[a-zA-Z0-9]+$/)
    ) {
      setCode.value = code;
    }
  } else {
    // fetch the user information when params change
    watch(
      () => route.params.code,
      (code) => {
        if (
          typeof code === 'string' &&
          code.length === 20 &&
          code.match(/^[a-zA-Z0-9]+$/)
        ) {
          showEnterPrompt.value = false;
          setCode.value = code;
        }
      }
    );
  }

  watch(modalSettings, () => {
    if (ignoreNextChange) {
      ignoreNextChange = false;
    } else {
      if (modalSettings.date) {
        const dateStart = moment(modalSettings.date).toDate();
        if (dateStart && !Number.isNaN(dateStart.getTime())) {
          ignoreNextChange = true;
          modalSettings.dateParsed = dateStart;
        } else {
          ignoreNextChange = true;
          modalSettings.dateParsed = null;
        }
      } else {
        ignoreNextChange = true;
        modalSettings.dateParsed = null;
      }
    }
  });

  const toggleScanning = () => {
    if (qrScanner) {
      if (scanning.value) {
        qrScanner.stop();
        scanning.value = false;
      } else if (
        !devices.value?.length &&
        navigator.mediaDevices?.enumerateDevices &&
        !startingScanning.value
      ) {
        startingScanning.value = true;
        (async () => {
          try {
            const media = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment' },
            });
            if (media) {
              const foundDevices = (
                await navigator.mediaDevices.enumerateDevices()
              ).filter((item) => item.deviceId && item.kind === 'videoinput');
              if (foundDevices.length) {
                devices.value = foundDevices;
                await qrScanner.start();
                currentDevice.value = foundDevices[0].deviceId;
                startingScanning.value = false;
                scanning.value = true;
              }
            }
          } catch (e: unknown) {
            console.error(e);
            throw e;
          }
        })();
      } else if (!startingScanning.value) {
        qrScanner.start();
        scanning.value = true;
      }
    }
  };

  const redeemFoundCode = () => {
    const code = setCode.value;
    if (code) {
      setCode.value = '';
      showEnterPrompt.value = true;
      if (code.length !== 20 || !code.match(/^[a-zA-Z0-9]+$/)) {
        codeMessage.value = 'Code is not in a valid format.';
      } else {
        (async () => {
          try {
            const codeProps = await getCode(code);
            if (codeProps) {
              const defaultAmount =
                codeProps.amountMin || codeProps.amountMax
                  ? Math.round(
                      (codeProps.amountMin ?? codeProps.amountMax ?? 0) +
                        (codeProps.amountMax ?? codeProps.amountMin ?? 0) / 2
                    )
                  : undefined;
              const defaultDate =
                codeProps.dateMin || codeProps.dateMax
                  ? new Date(
                      Math.round(
                        (codeProps.dateMin?.getTime() ??
                          codeProps.dateMax?.getTime() ??
                          0) +
                          (codeProps.dateMax?.getTime() ??
                            codeProps.dateMin?.getTime() ??
                            0) /
                            2
                      )
                    )
                  : undefined;
              const result = await openModalAndWait(
                codeProps.displayReason,
                defaultAmount,
                !codeProps.amountMin ||
                  !codeProps.amountMax ||
                  codeProps.amountMin !== codeProps.amountMax,
                defaultDate,
                !codeProps.dateMin ||
                  !codeProps.dateMax ||
                  codeProps.dateMin !== codeProps.dateMax,
                codeProps.autoSetHouse && hasConfirmedUserSession()
                  ? getConfirmedUserSessionHouse()
                  : codeProps.allowedHouses?.length === 1
                  ? codeProps.allowedHouses[0]
                  : undefined,
                codeProps.allowSettingHouse &&
                  (!codeProps.autoSetHouse ||
                    !hasConfirmedUserSession() ||
                    codeProps.allowedHouses?.length !== 1),
                (!codeProps.autoSetOwner || !hasSetUserSession()) &&
                  codeProps.allowedOwners?.length === 1
                  ? codeProps.allowedOwners[0]
                  : undefined,
                codeProps.allowSettingOwner &&
                  (!codeProps.autoSetOwner ||
                    !hasSetUserSession() ||
                    codeProps.allowedOwners?.length !== 1),
                codeProps.allowSettingReason
              );
              if (
                result &&
                modalSettings.amount &&
                modalSettings.dateParsed &&
                modalSettings.house
              ) {
                redeemCode(
                  code,
                  modalSettings.amount,
                  modalSettings.dateParsed,
                  modalSettings.house,
                  modalSettings.owner || undefined,
                  modalSettings.reason || undefined
                );
              }
            }
          } catch (e: unknown) {
            console.error(e);
            throw e;
          }
        })();
      }
    }
  };

  const addQrScanner = (element: HTMLVideoElement) => {
    qrScanner = new QrScanner(element, (result: string) => {
      if (result.startsWith(redeemPath)) {
        const code = result.replace(redeemPath, '');
        if (code.length === 20 && code.match(/^[a-zA-Z0-9]+$/)) {
          setCode.value = code;
          if (scanning.value) {
            toggleScanning();
          }
        }
      }
    });
  };

  watch(currentDevice, (id) => {
    if (skipNextEvent) {
      skipNextEvent = false;
    } else if (qrScanner && scanning.value && id) {
      qrScanner.setCamera(id);
    }
  });

  watch(setCode, () => {
    if (setCode.value && codeMessage.value) {
      codeMessage.value = '';
    }
  });

  if (!hasUserSession()) {
    router.push('/admin');
  } else if (!hasSetUserSession()) {
    router.push('/login');
  } else if (!hasConfirmedUserSession()) {
    router.push('/login');
  } else {
    (async () => {
      try {
        if (await checkSessionAsync(false, true)) {
          if (qrScannerElement.value) {
            addQrScanner(qrScannerElement.value);
          } else {
            const stopWatching = watch(qrScannerElement, (element) => {
              if (element) {
                addQrScanner(element);
                stopWatching();
              }
            });
          }
        }
      } catch (e: unknown) {
        console.error(e);
        throw e;
      }
    })();
  }
</script>

<template>
  <div class="content-base redeem">
    <div class="redeemtitle">Redeem</div>
    <video
      ref="qrScannerElement"
      class="camera"
      :class="{
        hide: !scanning && !startingScanning,
      }"
    ></video>
    <button @click="toggleScanning()">
      {{
        scanning
          ? 'Stop Scanning'
          : showEnterPrompt
          ? 'Start Scanning'
          : 'Scan other Code'
      }}
    </button>
    <select v-if="scanning && devices?.length" v-model="currentDevice">
      <option
        v-for="device in devices"
        :key="device.deviceId"
        :value="device.deviceId"
        :selected="device.deviceId === currentDevice"
      >
        {{ device.label }}
      </option>
    </select>
    <template v-if="!scanning">
      <label class="label code-label login-item" for="code"
        >{{
          showEnterPrompt
            ? 'Please enter the code you want to redeem'
            : 'Code to redeem'
        }}{{ codeMessage ? ': ' + codeMessage : '' }}
      </label>
      <input
        id="code"
        v-model="setCode"
        type="text"
        class="field code login-item"
        name="code"
        placeholder="jAbLrGNXC7CnSAGXvZYA"
        maxlength="20"
        @keyup.enter="redeemFoundCode()"
      />
    </template>
    <template v-else-if="setCode">
      Found Code: {{ setCode }}
      <span v-if="codeMessage" class="label code-label login-item"
        >{{ codeMessage }}
      </span>
    </template>
    <template v-if="setCode">
      <button
        class="login-item login-button"
        @keyup.enter="redeemFoundCode()"
        @click="redeemFoundCode()"
      >
        Redeem Code
      </button>
    </template>
    <Transition name="modal">
      <div v-if="showModal" class="modal-mask">
        <div class="modal-wrapper">
          <div class="modal-container">
            <div class="modal-header">
              <slot name="header">Redeem Code</slot>
            </div>
            <div class="modal-body">
              <div v-if="modalSettings.displayReason" class="title">
                {{ modalSettings.displayReason }}
              </div>
              <div
                v-if="modalSettings.amount || modalSettings.allowSettingAmount"
                class="amount-container input-container"
              >
                <label for="amount"
                  >Amount{{
                    modalSettings.amount && !modalSettings.amount
                      ? ': Please enter a valid amount'
                      : ''
                  }}</label
                >
                <input
                  id="amount"
                  v-model="modalSettings.amount"
                  type="number"
                  name="amount"
                  placeholder="10 / -3"
                  :disabled="!modalSettings.allowSettingAmount"
                  :class="{ warning: !modalSettings.amount }"
                />
              </div>
              <div
                v-if="modalSettings.date || modalSettings.allowSettingDate"
                class="date-container input-container"
              >
                <label for="date"
                  >Date{{
                    modalSettings.date && !modalSettings.dateParsed
                      ? ': Please enter a valid date'
                      : ''
                  }}</label
                >
                <div class="date-inner-container">
                  <input
                    id="date"
                    v-model="modalSettings.date"
                    type="date"
                    name="date"
                    placeholder="Date"
                    :disabled="!modalSettings.allowSettingDate"
                    :class="{
                      warning: modalSettings.date && !modalSettings.dateParsed,
                    }"
                  />
                </div>
              </div>
              <div
                v-if="modalSettings.house || modalSettings.allowSettingHouse"
                class="house-container input-container"
              >
                <label for="house"
                  >House{{
                    modalSettings.house && !modalSettings.house
                      ? ': Please select a house'
                      : ''
                  }}</label
                >
                <select
                  id="house"
                  v-model="modalSettings.house"
                  :disabled="!modalSettings.allowSettingHouse"
                  :class="{ warning: !modalSettings.house }"
                >
                  <option v-for="color in Object.keys(COLORS)" :key="color">
                    {{ COLORS[color as keyof typeof COLORS] }}
                  </option>
                </select>
              </div>
              <div
                v-if="modalSettings.owner || modalSettings.allowSettingOwner"
                class="owner-container input-container"
              >
                <label for="owner">Owner</label>
                <input
                  id="owner"
                  v-model="modalSettings.owner"
                  type="text"
                  name="owner"
                  maxlength="100"
                  placeholder="Person"
                  :disabled="!modalSettings.allowSettingOwner"
                />
              </div>
              <div
                v-if="modalSettings.reason || modalSettings.allowSettingReason"
                class="reason-container input-container"
              >
                <label for="reason">Reason</label>
                <input
                  id="reason"
                  v-model="modalSettings.reason"
                  type="text"
                  name="reason"
                  placeholder="General"
                  maxlength="1000"
                  :disabled="!modalSettings.allowSettingReason"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="modal-default-button" @click="validateModal()">
                <span class="icon button-icon icon-ok"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
  .redeem {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;

    .redeemtitle {
      display: flex;
      flex-direction: row;
      align-items: center;

      .icon {
        font-size: 1.5rem;
        cursor: pointer;
      }
    }
  }

  .camera {
    height: 70%;
    width: 100%;
    object-fit: contain;
    display: block;

    &.hide {
      height: 0;
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
</style>
