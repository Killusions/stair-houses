import { reactive, ref } from 'vue';
import {
  getConfirmedUserSessionHouse,
  hasConfirmedUserSession,
  hasSession,
  hasSetUserSession,
  hasUserSession,
} from './data';

export const ranking = ref(false);

export const secret = ref(false);

export const codesModal = ref(false);

export const loggedIn = ref(hasSession());
export const userLoggedIn = ref(hasUserSession());
export const userSet = ref(hasSetUserSession());
export const userConfirmed = ref(hasConfirmedUserSession());
export const userCurrentConfirmed = ref(hasConfirmedUserSession());
export const userConfirmedHouse = ref(getConfirmedUserSessionHouse());

export const resetState = () => {
  loggedIn.value = hasSession();
  userLoggedIn.value = hasUserSession();
  userSet.value = hasSetUserSession();
  userConfirmed.value = hasConfirmedUserSession();
  userCurrentConfirmed.value = hasConfirmedUserSession();
  userConfirmedHouse.value = getConfirmedUserSessionHouse();
};

export const loading = ref(true);

export const resetSettings = () => {
  settings.amount = 1;
  settings.keepAmount = false;
  settings.date = '';
  settings.keepDate = false;
  settings.owner = '';
  settings.keepOwner = false;
  settings.reason = '';
  settings.keepReason = false;
};

export const resetFilters = () => {
  filters.reason = '';
  filters.dateStart = '';
  filters.dateStartParsed = null;
  filters.dateEnd = '';
  filters.dateEndParsed = null;
};

export const settings = reactive({
  amount: 1,
  keepAmount: false,
  date: '',
  keepDate: false,
  owner: '',
  keepOwner: false,
  reason: '',
  keepReason: false,
});

export const filters = reactive({
  reason: '',
  dateStart: '',
  dateStartParsed: null as Date | null,
  dateEnd: '',
  dateEndParsed: null as Date | null,
});
