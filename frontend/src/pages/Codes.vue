<script setup lang="ts">
  import { useRouter } from 'vue-router';
  import { addCode, authFailure, checkSession, redeemPath } from '../data';
  import { resetFilters, resetSettings, resetState } from '../settings';
  import QrcodeVue from 'qrcode.vue';
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

  checkSession(true);

  const downloadCode = () => {
    if (true) {
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      const code = (
        document.querySelector('.download-code') as HTMLCanvasElement
      ).toDataURL();
      if (code) {
        link.href = code;
        link.click();
      }
    }
  };

  let ignoreNextChange = false;

  const showModal = ref(false);

  const currentCode = ref('');

  const modalSettings = reactive({
    autoRenew: undefined as number | undefined,
    displayReason: '',
    internalReason: '',
    amountMin: undefined as number | undefined,
    amountMax: undefined as number | undefined,
    house: '' as keyof typeof COLORS | '',
    reason: '',
    reasonSet: false,
    reasonParsed: undefined as string | undefined,
    dateMinKeepUpdated: true,
    dateMinFocused: false,
    dateMin: '',
    dateMinParsed: undefined as Date | undefined,
    dateMaxKeepUpdated: true,
    dateMaxFocused: false,
    dateMax: '',
    dateMaxParsed: undefined as Date | undefined,
    redeemDateStartKeepUpdated: true,
    redeemDateStartFocused: false,
    redeemDateStart: '',
    redeemDateStartParsed: undefined as Date | undefined,
    redeemDateEndKeepUpdated: true,
    redeemDateEndFocused: false,
    redeemDateEnd: '',
    redeemDateEndParsed: undefined as Date | undefined,
    allowedOwners: '',
    allowedOwnersParsed: [] as string[],
    allowedHouses: Object.keys(COLORS).reduce(
      (o, color) => ({ ...o, [color]: false }),
      {} as { [key in keyof typeof COLORS]: boolean }
    ),
    allowedHousesParsed: [] as (keyof typeof COLORS)[],
    maxRedeems: 1,
    redeemablePerRedeemer: 1,
    redeemablePerHouse: 1,
    onlyAdmin: false,
    onlyEligible: true,
    onlyLoggedIn: true,
    showAllowedHouses: true,
    allowSettingHouse: false,
    autoSetHouse: true,
    allowSettingReason: false,
    owner: '',
    showAllowedOwners: false,
    allowSettingOwner: false,
    autoSetOwner: true,
  });

  setInterval(() => {
    if (
      modalSettings.dateMin &&
      modalSettings.dateMinParsed &&
      modalSettings.dateMinKeepUpdated &&
      !modalSettings.dateMinFocused
    ) {
      modalSettings.dateMinParsed = new Date(
        modalSettings.dateMinParsed.getTime() + 1000
      );
      modalSettings.dateMin = moment(modalSettings.dateMinParsed).format(
        'YYYY-MM-DDTHH:mm'
      );
    }
    if (
      modalSettings.dateMax &&
      modalSettings.dateMaxParsed &&
      modalSettings.dateMaxKeepUpdated &&
      !modalSettings.dateMaxFocused
    ) {
      modalSettings.dateMaxParsed = new Date(
        modalSettings.dateMaxParsed.getTime() + 1000
      );
      modalSettings.dateMax = moment(modalSettings.dateMaxParsed).format(
        'YYYY-MM-DDTHH:mm'
      );
    }
    if (
      modalSettings.redeemDateStart &&
      modalSettings.redeemDateStartParsed &&
      modalSettings.redeemDateStartKeepUpdated &&
      !modalSettings.redeemDateStartFocused
    ) {
      modalSettings.redeemDateStartParsed = new Date(
        modalSettings.redeemDateStartParsed.getTime() + 1000
      );
      modalSettings.redeemDateStart = moment(
        modalSettings.redeemDateStartParsed
      ).format('YYYY-MM-DDTHH:mm');
    }
    if (
      modalSettings.redeemDateEnd &&
      modalSettings.redeemDateEndParsed &&
      modalSettings.redeemDateEndKeepUpdated &&
      !modalSettings.redeemDateEndFocused
    ) {
      modalSettings.redeemDateEndParsed = new Date(
        modalSettings.redeemDateEndParsed.getTime() + 1000
      );
      modalSettings.redeemDateEnd = moment(
        modalSettings.redeemDateEndParsed
      ).format('YYYY-MM-DDTHH:mm');
    }
  }, 1000);

  const resetModalSettings = () => {
    ignoreNextChange = true;
    modalSettings.autoRenew = undefined;
    modalSettings.displayReason = '';
    modalSettings.internalReason = '';
    modalSettings.amountMin = undefined;
    modalSettings.amountMax = undefined;
    modalSettings.house = '';
    modalSettings.reason = '';
    modalSettings.reasonSet = false;
    modalSettings.reasonParsed = undefined;
    modalSettings.dateMinKeepUpdated = true;
    modalSettings.dateMinFocused = false;
    modalSettings.dateMin = '';
    modalSettings.dateMinParsed = undefined;
    modalSettings.dateMaxKeepUpdated = true;
    modalSettings.dateMaxFocused = false;
    modalSettings.dateMax = '';
    modalSettings.dateMaxParsed = undefined;
    modalSettings.redeemDateStartKeepUpdated = true;
    modalSettings.redeemDateStartFocused = false;
    modalSettings.redeemDateStart = '';
    modalSettings.redeemDateStartParsed = undefined;
    modalSettings.redeemDateEndKeepUpdated = true;
    modalSettings.redeemDateEndFocused = false;
    modalSettings.redeemDateEnd = '';
    modalSettings.redeemDateEndParsed = undefined;
    modalSettings.allowedOwners = '';
    modalSettings.allowedOwnersParsed = [];
    modalSettings.allowedHouses = Object.keys(COLORS).reduce(
      (o, color) => ({ ...o, [color]: false }),
      {} as { [key in keyof typeof COLORS]: boolean }
    );
    modalSettings.allowedHousesParsed = [];
    modalSettings.maxRedeems = 1;
    modalSettings.redeemablePerRedeemer = 1;
    modalSettings.redeemablePerHouse = 1;
    modalSettings.onlyAdmin = false;
    modalSettings.onlyEligible = true;
    modalSettings.onlyLoggedIn = true;
    modalSettings.showAllowedHouses = true;
    modalSettings.allowSettingHouse = false;
    modalSettings.autoSetHouse = true;
    modalSettings.allowSettingReason = false;
    modalSettings.owner = '';
    modalSettings.showAllowedOwners = false;
    modalSettings.allowSettingOwner = false;
    modalSettings.autoSetOwner = true;
  };

  let modalCloseCallback: ((confirm: boolean) => void) | undefined;

  const openModal = () => {
    showModal.value = true;
  };

  const openModalAndWait = () =>
    new Promise<boolean>((resolve) => {
      resetModalSettings();
      modalCloseCallback = (confirm: boolean) => {
        modalCloseCallback = undefined;
        resolve(confirm);
      };
      openModal();
    });

  const closeModal = (confirm = false) => {
    if (showModal.value) {
      showModal.value = false;
      if (modalCloseCallback) {
        modalCloseCallback(true);
        if (!confirm) {
          resetModalSettings();
        }
      } else {
        resetModalSettings();
      }
    }
  };

  const validateModal = () => {
    if (
      showModal.value &&
      (modalSettings.amountMin === undefined ||
        modalSettings.amountMax === undefined ||
        modalSettings.amountMin < modalSettings.amountMax)
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

  watch(modalSettings, () => {
    if (ignoreNextChange) {
      ignoreNextChange = false;
    } else {
      if (modalSettings.reasonSet) {
        ignoreNextChange = true;
        modalSettings.reason = modalSettings.reason ?? undefined;
      } else {
        ignoreNextChange = true;
        modalSettings.reasonParsed = undefined;
      }
      if (modalSettings.dateMin) {
        const dateMin = moment(modalSettings.dateMin).toDate();
        if (dateMin && !Number.isNaN(dateMin.getTime())) {
          ignoreNextChange = true;
          modalSettings.dateMinParsed = dateMin;
        } else {
          ignoreNextChange = true;
          modalSettings.dateMinParsed = undefined;
        }
      } else {
        ignoreNextChange = true;
        modalSettings.dateMinParsed = undefined;
      }
      if (modalSettings.dateMax) {
        const dateMax = moment(modalSettings.dateMax).toDate();
        if (dateMax && !Number.isNaN(dateMax.getTime())) {
          ignoreNextChange = true;
          modalSettings.dateMaxParsed = dateMax;
        } else {
          ignoreNextChange = true;
          modalSettings.dateMaxParsed = undefined;
        }
      } else {
        ignoreNextChange = true;
        modalSettings.dateMaxParsed = undefined;
      }
      if (modalSettings.redeemDateStart) {
        const dateStart = moment(modalSettings.redeemDateStart).toDate();
        if (dateStart && !Number.isNaN(dateStart.getTime())) {
          ignoreNextChange = true;
          modalSettings.redeemDateStartParsed = dateStart;
        } else {
          ignoreNextChange = true;
          modalSettings.redeemDateStartParsed = undefined;
        }
      } else {
        ignoreNextChange = true;
        modalSettings.redeemDateStartParsed = undefined;
      }
      if (modalSettings.redeemDateEnd) {
        const dateEnd = moment(modalSettings.redeemDateEnd).toDate();
        if (dateEnd && !Number.isNaN(dateEnd.getTime())) {
          ignoreNextChange = true;
          modalSettings.redeemDateEndParsed = dateEnd;
        } else {
          ignoreNextChange = true;
          modalSettings.redeemDateEndParsed = undefined;
        }
      } else {
        ignoreNextChange = true;
        modalSettings.redeemDateEndParsed = undefined;
      }
      if (modalSettings.allowedOwners) {
        ignoreNextChange = true;
        modalSettings.allowedOwnersParsed =
          modalSettings.allowedOwners.split(',');
      } else {
        ignoreNextChange = true;
        modalSettings.allowedOwnersParsed = [];
      }
      if (Object.values(modalSettings.allowedHouses).includes(true)) {
        ignoreNextChange = true;
        modalSettings.allowedHousesParsed = (
          Object.keys(modalSettings.allowedHouses) as (keyof typeof COLORS)[]
        ).filter((item) => modalSettings.allowedHouses[item]);
      } else {
        ignoreNextChange = true;
        modalSettings.allowedHousesParsed = [];
      }
    }
  });

  (async () => {
    try {
      while (!(await openModalAndWait())) {}
      currentCode.value =
        (await addCode(
          modalSettings.displayReason || undefined,
          modalSettings.internalReason || undefined,
          modalSettings.amountMin,
          modalSettings.amountMax,
          modalSettings.house || undefined,
          modalSettings.reasonParsed,
          modalSettings.dateMinParsed,
          modalSettings.dateMaxParsed,
          modalSettings.redeemDateStartParsed,
          modalSettings.redeemDateEndParsed,
          modalSettings.allowedOwnersParsed,
          modalSettings.allowedHousesParsed,
          modalSettings.maxRedeems,
          modalSettings.redeemablePerRedeemer,
          modalSettings.redeemablePerHouse,
          modalSettings.onlyAdmin,
          modalSettings.onlyEligible,
          modalSettings.onlyLoggedIn,
          modalSettings.showAllowedHouses,
          modalSettings.allowSettingHouse,
          modalSettings.autoSetHouse,
          modalSettings.allowSettingReason,
          modalSettings.owner || undefined,
          modalSettings.showAllowedOwners,
          modalSettings.allowSettingOwner,
          modalSettings.autoSetOwner
        )) ?? '';
    } catch (e: unknown) {
      console.error(e);
      throw e;
    }
  })();
</script>

<template>
  <div class="content-base codes">
    <div class="codestitle">Codes</div>
    <template v-if="currentCode">
      <QrcodeVue
        :class="'generated-code'"
        :value="redeemPath + currentCode"
        render-as="svg"
      ></QrcodeVue>
      <QrcodeVue
        :class="'download-code'"
        :value="redeemPath + currentCode"
        render-as="canvas"
        :size="1000"
      ></QrcodeVue>
      <button v-if="true" @click="downloadCode()">Download Code</button>
    </template>
    <Transition name="modal">
      <div v-if="showModal" class="modal-mask">
        <div class="modal-wrapper">
          <div class="modal-container">
            <div class="modal-header">
              <slot name="header">Add Code</slot>
            </div>
            <div class="modal-body">
              <div class="auto-renew-container input-container">
                <label for="autoRenew">Auto Renew in seconds</label>
                <input
                  id="autoRenew"
                  v-model="modalSettings.autoRenew"
                  type="number"
                  name="autoRenew"
                  placeholder="60"
                />
              </div>
              <div class="display-reason-container input-container">
                <label for="displayReason">Public Reason</label>
                <input
                  id="displayReason"
                  v-model="modalSettings.displayReason"
                  type="text"
                  name="displayReason"
                  maxlength="1000"
                  placeholder="Beer Pong"
                />
              </div>
              <div class="internal-reason-container input-container">
                <label for="internalReason">Internal Reason</label>
                <input
                  id="internalReason"
                  v-model="modalSettings.internalReason"
                  type="text"
                  name="internalReason"
                  maxlength="1000"
                  placeholder="Beer Pong First Code"
                />
              </div>
              <div class="amount-min-container input-container">
                <label for="amountMin">Minimum Amount</label>
                <input
                  id="amountMin"
                  v-model="modalSettings.amountMin"
                  type="number"
                  name="amountMin"
                  placeholder="10 / -3"
                />
              </div>
              <div class="amount-max-container input-container">
                <label for="amountMax">Maximum Amount</label>
                <input
                  id="amountMax"
                  v-model="modalSettings.amountMin"
                  type="number"
                  name="amountMin"
                  placeholder="10 / -3"
                />
              </div>
              <div
                class="checkbox-container date-min-keep-updated-container input-container"
              >
                <input
                  id="dateMinKeepUpdated"
                  v-model="modalSettings.dateMinKeepUpdated"
                  type="checkbox"
                  name="dateMinKeepUpdated"
                />
                <label for="dateMinKeepUpdated"
                  >Keep earliest Date updated (tick)</label
                >
              </div>
              <div class="date-container date-min-container input-container">
                <label for="dateMin">Earliest Date</label>
                <div class="date-inner-container">
                  <input
                    id="dateMin"
                    v-model="modalSettings.dateMin"
                    type="datetime-local"
                    name="dateMin"
                    placeholder="Date"
                    @focus="modalSettings.dateMinFocused = true"
                    @blur="modalSettings.dateMinFocused = false"
                  />
                </div>
              </div>
              <div
                class="checkbox-container date-max-keep-updated-container input-container"
              >
                <input
                  id="dateMaxKeepUpdated"
                  v-model="modalSettings.dateMaxKeepUpdated"
                  type="checkbox"
                  name="dateMaxKeepUpdated"
                />
                <label for="dateMaxKeepUpdated"
                  >Keep latest Date updated (tick)</label
                >
              </div>
              <div class="date-container date-max-container input-container">
                <label for="dateMax">Latest Date</label>
                <div class="date-inner-container">
                  <input
                    id="dateMax"
                    v-model="modalSettings.dateMax"
                    type="datetime-local"
                    name="dateMax"
                    placeholder="Date"
                    @focus="modalSettings.dateMaxFocused = true"
                    @blur="modalSettings.dateMaxFocused = false"
                  />
                </div>
              </div>
              <div
                v-for="house in Object.keys(modalSettings.allowedHouses) as (keyof typeof COLORS)[]"
                :key="house"
                class="checkbox-container allow-house-container allow-{{ color }}-house-container input-container"
              >
                <input
                  id="allow{{ house.charAt(0).toUpperCase() + house.slice(1) }}House"
                  v-model="modalSettings.allowedHouses[house]"
                  type="checkbox"
                  name="allow{{ house.charAt(0).toUpperCase() + house.slice(1) }}House"
                />
                <label
                  for="allow{{ house.charAt(0).toUpperCase() + house.slice(1) }}House"
                  >Allow {{ COLORS[house] }} House</label
                >
              </div>
              <div class="house-container input-container">
                {{ modalSettings.house }}
                <label for="house">House</label>
                <select id="house" v-model="modalSettings.house">
                  <option>No default House</option>
                  <option
                    v-for="color in Object.keys(COLORS) as (keyof typeof COLORS)[]"
                    :key="color"
                  >
                    {{ COLORS[color] }}
                  </option>
                </select>
              </div>
              <div
                class="checkbox-container reason-set-container input-container"
              >
                <input
                  id="reasonSet"
                  v-model="modalSettings.reasonSet"
                  type="checkbox"
                  name="reasonSet"
                />
                <label for="reasonSet">Set Reason</label>
              </div>
              <div
                v-if="modalSettings.reasonSet"
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
                  :disabled="!modalSettings.reasonSet"
                />
              </div>
              <div
                class="checkbox-container redeem-date-start-keep-updated-container input-container"
              >
                <input
                  id="redeemDateStartKeepUpdated"
                  v-model="modalSettings.redeemDateStartKeepUpdated"
                  type="checkbox"
                  name="redeemDateStartKeepUpdated"
                />
                <label for="redeemDateStartKeepUpdated"
                  >Keep earliest Redeem Date updated (tick)</label
                >
              </div>
              <div
                class="date-container redeem-date-start-container input-container"
              >
                <label for="redeemDateStart">Earliest Redeem Date</label>
                <div class="date-inner-container">
                  <input
                    id="redeemDateStart"
                    v-model="modalSettings.redeemDateStart"
                    type="datetime-local"
                    name="redeemDateStart"
                    placeholder="Date"
                    @focus="modalSettings.redeemDateStartFocused = true"
                    @blur="modalSettings.redeemDateStartFocused = false"
                  />
                </div>
              </div>
              <div
                class="checkbox-container redeem-date-end-keep-updated-container input-container"
              >
                <input
                  id="redeemDateEndKeepUpdated"
                  v-model="modalSettings.redeemDateEndKeepUpdated"
                  type="checkbox"
                  name="redeemDateEndKeepUpdated"
                />
                <label for="redeemDateEndKeepUpdated"
                  >Keep latest Redeem Date updated (tick)</label
                >
              </div>
              <div
                class="date-container redeem-date-end-container input-container"
              >
                <label for="redeemDateEnd">Latest Redeem Date</label>
                <div class="date-inner-container">
                  <input
                    id="redeemDateEnd"
                    v-model="modalSettings.redeemDateEnd"
                    type="datetime-local"
                    name="redeemDateEnd"
                    placeholder="Date"
                    @focus="modalSettings.redeemDateEndFocused = true"
                    @blur="modalSettings.redeemDateEndFocused = false"
                  />
                </div>
              </div>
              <div class="allowed-owners-container input-container">
                <label for="allowedOwners"
                  >Allowed Owners (list separated by commas)</label
                >
                <input
                  id="allowedOwners"
                  v-model="modalSettings.allowedOwners"
                  type="text"
                  name="allowedOwners"
                  maxlength="100999"
                  placeholder="Person,Person"
                />
              </div>
              <div class="owner-container input-container">
                <label for="owner">Owner</label>
                <input
                  id="owner"
                  v-model="modalSettings.owner"
                  type="text"
                  name="owner"
                  maxlength="100"
                  placeholder="Person"
                />
              </div>
              <div class="max-redeems-container input-container">
                <label for="maxRedeems">Max Redeems</label>
                <input
                  id="maxRedeems"
                  v-model="modalSettings.maxRedeems"
                  type="number"
                  name="amountMin"
                  placeholder="1"
                />
              </div>
              <div class="redeemable-per-redeemer-container input-container">
                <label for="redeemablePerRedeemer">Redeems Per Redeemer</label>
                <input
                  id="redeemablePerRedeemer"
                  v-model="modalSettings.redeemablePerRedeemer"
                  type="number"
                  name="amountMin"
                  placeholder="1"
                />
              </div>
              <div class="redeemable-per-house-container input-container">
                <label for="redeemablePerHouse">Redeems Per House</label>
                <input
                  id="redeemablePerHouse"
                  v-model="modalSettings.redeemablePerHouse"
                  type="number"
                  name="redeemablePerHouse"
                  placeholder="1"
                />
              </div>
              <div
                class="checkbox-container only-admin-container input-container"
              >
                <input
                  id="onlyAdmin"
                  v-model="modalSettings.onlyAdmin"
                  type="checkbox"
                  name="onlyAdmin"
                />
                <label for="onlyAdmin">Only Admin</label>
              </div>
              <div
                class="checkbox-container only-eligible-container input-container"
              >
                <input
                  id="onlyEligible"
                  v-model="modalSettings.onlyEligible"
                  type="checkbox"
                  name="onlyEligible"
                />
                <label for="onlyEligible">Only Eligible</label>
              </div>
              <div
                class="checkbox-container only-logged-in-container input-container"
              >
                <input
                  id="onlyLoggedIn"
                  v-model="modalSettings.onlyLoggedIn"
                  type="checkbox"
                  name="onlyLoggedIn"
                />
                <label for="onlyLoggedIn">Only Logged-In Users</label>
              </div>
              <div
                class="checkbox-container show-allowed-houses-container input-container"
              >
                <input
                  id="showAllowedHouses"
                  v-model="modalSettings.showAllowedHouses"
                  type="checkbox"
                  name="showAllowedHouses"
                />
                <label for="showAllowedHouses"
                  >Show allowed Houses to Redeemer</label
                >
              </div>
              <div
                class="checkbox-container allow-setting-house-container input-container"
              >
                <input
                  id="allowSettingHouse"
                  v-model="modalSettings.allowSettingHouse"
                  type="checkbox"
                  name="allowSettingHouse"
                />
                <label for="allowSettingHouse"
                  >Allow Setting House for Redeemer</label
                >
              </div>
              <div
                class="checkbox-container auto-set-house-container input-container"
              >
                <input
                  id="autoSetHouse"
                  v-model="modalSettings.autoSetHouse"
                  type="checkbox"
                  name="autoSetHouse"
                />
                <label for="autoSetHouse"
                  >Automatically set to Redeemers House</label
                >
              </div>
              <div
                class="checkbox-container allow-setting-reason-container input-container"
              >
                <input
                  id="allowSettingReason"
                  v-model="modalSettings.allowSettingReason"
                  type="checkbox"
                  name="allowSettingReason"
                />
                <label for="allowSettingReason"
                  >Allow Setting Reason for Redeemer</label
                >
              </div>
              <div
                class="checkbox-container show-allowed-owners-container input-container"
              >
                <input
                  id="showAllowedOwners"
                  v-model="modalSettings.showAllowedOwners"
                  type="checkbox"
                  name="showAllowedOwners"
                />
                <label for="showAllowedOwners"
                  >Show allowed Owners to Redeemer (Warning, private
                  information!)</label
                >
              </div>
              <div
                class="checkbox-container allow-setting-owner-container input-container"
              >
                <input
                  id="allowSettingOwner"
                  v-model="modalSettings.allowSettingOwner"
                  type="checkbox"
                  name="allowSettingOwner"
                />
                <label for="allowSettingOwner"
                  >Allow Setting Owner for Redeemer</label
                >
              </div>
              <div
                class="checkbox-container auto-set-owner-container input-container"
              >
                <input
                  id="autoSetOwner"
                  v-model="modalSettings.autoSetOwner"
                  type="checkbox"
                  name="autoSetOwner"
                />
                <label for="autoSetOwner"
                  >Automatically set Redeemer as Owner</label
                >
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
  .codes {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;

    .codestitle {
      display: flex;
      flex-direction: row;
      align-items: center;

      .icon {
        font-size: 1.5rem;
        cursor: pointer;
      }
    }

    .generated-code {
      aspect-ratio: 1 / 1;
      height: 90% !important;
      width: unset !important;
    }

    .download-code {
      height: 0 !important;
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

  @media (max-aspect-ratio: 1/1) {
    .codes .generated-code {
      height: unset !important;
      width: 80% !important;
    }
  }
</style>
