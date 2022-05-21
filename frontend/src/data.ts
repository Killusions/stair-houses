import type { AppRouter } from '../../backend/src/router';
import { createWSClient, wsLink } from '@trpc/client/links/wsLink';
import { createTRPCClient } from '@trpc/client';
import type {
  PointsCategory,
  PointsWithStats,
  UserInfoPrivate,
} from '../../backend/src/model';
import { BehaviorSubject, Subject } from 'rxjs';
import superjson from 'superjson';
import { COLORS } from '../../backend/src/constants';
import type { DisplayColor, DisplayData } from './model';

const protocol = import.meta.env.VITE_STAIR_HOUSES_PROTOCOL ?? 'ws';
const host = import.meta.env.VITE_STAIR_HOUSES_BACKEND_HOST ?? 'localhost';
const port = import.meta.env.VITE_STAIR_HOUSES_BACKEND_PORT ?? '3033';

const wsClient = createWSClient({
  url: protocol + '://' + host + ':' + port + '/',
});

const client = createTRPCClient<AppRouter>({
  links: [
    wsLink({
      client: wsClient,
    }),
  ],
  transformer: superjson,
});

let loggingOut = false;
let sessionExpires =
  parseInt(localStorage.getItem('sessionExpires') ?? '') ?? 0;
let sessionId = localStorage.getItem('session') ?? '';
let isAdmin = localStorage.getItem('admin') === 'true';
let sessionUserId = localStorage.getItem('sessionUserId') ?? '';
let infosSet = !!localStorage.getItem('infosSet') ?? false;
let houseConfirmed =
  (localStorage.getItem('houseConfirmed') as keyof typeof COLORS | undefined) ||
  undefined;
let current = !!localStorage.getItem('current') ?? false;

let setCode = '';
let setExpired = 0;

let userInfo: UserInfoPrivate | null = null;

export const isLoggingOut = () => {
  return loggingOut;
};

export const hasSession = (admin = false) => {
  return !!sessionId && sessionExpires > Date.now() && (!admin || isAdmin);
};

export const hasConfirmedCurrentUserSession = () => {
  return hasConfirmedUserSession() && current;
};

export const hasConfirmedUserSession = () => {
  return hasSetUserSession() && houseConfirmed;
};

export const hasSetUserSession = () => {
  return hasUserSession() && infosSet;
};

export const hasUserSession = () => {
  return hasSession() && !isAdmin;
};

export const hasSetCode = () => {
  return !!setCode && setExpired > Date.now();
};

export const checkHasSetCode = async () => {
  if (!hasSetCode()) {
    await logOut();
    authFailure.next();
    return false;
  }
  return true;
};

export const clearSetCode = () => {
  setCode = '';
  setExpired = 0;
};

export const authFailure = new Subject<void>();

authFailure.subscribe(() => {
  clearAll();
});

const clearAll = () => {
  clearSetCode();
  clearUserInfo();
};

const clearUserInfo = () => {
  userInfo = null;
};

let points: PointsWithStats[] = Object.keys(COLORS).map((item) => ({
  color: item as keyof typeof COLORS,
  points: 0,
  lastChanged: new Date(0),
  categories: [],
}));

const placesStrings = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

const lastString = '';

const scale = 2.1;
const maxGrowScale = 1.5;

let previousMaxIndex = 0;

const randomOrder: { [key: string]: number } = {};

const processData = (data: PointsWithStats[], zero = false): DisplayData => {
  const highestPoints = Math.max(...data.map((item) => item.points));

  let pointsMaxIndex = scale * highestPoints;
  if (previousMaxIndex) {
    if (pointsMaxIndex < previousMaxIndex * maxGrowScale) {
      pointsMaxIndex = previousMaxIndex;
    } else {
      pointsMaxIndex = pointsMaxIndex / maxGrowScale;
    }
  }

  previousMaxIndex = pointsMaxIndex;

  if (!pointsMaxIndex) {
    pointsMaxIndex = 1;
  }

  const dataNormalizedArray: {
    color: string;
    relative: number;
    points: number;
    categories: PointsCategory[];
  }[] = data.map((item) => ({
    color: item.color,
    relative: item.points / pointsMaxIndex,
    points: item.points,
    categories: item.categories,
  }));

  dataNormalizedArray.sort((a, b) => {
    if (a.points < b.points) {
      return 1;
    }
    if (a.points > b.points) {
      return -1;
    }
    const previousRandom = randomOrder[a.color + '-' + b.color];
    if (previousRandom) {
      return 0;
    }
    const previousReverseRandom = randomOrder[b.color + '-' + a.color];
    if (previousReverseRandom) {
      return 0;
    }
    const random = Math.random();
    randomOrder[a.color + '-' + b.color] = random;
    if (random < 0.5) {
      return 0;
    } else {
      return -1;
    }
  });

  let previousScore = -1;
  let previousPlaceString = '';

  const displayData: DisplayData = dataNormalizedArray.map((item, index) => {
    let badgeString = '';
    let badgeClass = '';
    if (item.points === previousScore) {
      badgeString = previousPlaceString;
    } else {
      if (
        lastString &&
        (item.points === 0 ||
          index === dataNormalizedArray.length - 1 ||
          !dataNormalizedArray
            .slice(index)
            .find((searchItem) => searchItem.points < item.points))
      ) {
        previousPlaceString = lastString;
      } else {
        previousPlaceString = placesStrings[index] ?? '';
      }
      badgeString = previousPlaceString;
      previousScore = item.points;
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

    const previousColor = zero
      ? item.color
      : dataSubject.value[index]?.color ?? item.color;
    const returnObject: DisplayColor = {
      color: item.color,
      colorString: item.color.charAt(0).toUpperCase() + item.color.slice(1),
      currentColor: previousColor,
      previousColor,
      points: item.points,
      relativePercentage: item.relative * 100,
      currentPercentage: zero
        ? 0
        : dataSubject.value.find((prevItem) => prevItem.color === item.color)
            ?.currentPercentage ?? 0,
      badgeString,
      badgeClass,
      categories: item.categories.sort((a, b) => b.amount - a.amount),
    };
    return returnObject;
  });

  return displayData;
};

export const zeroData = processData(points, true);

const dataSubject = new BehaviorSubject(zeroData);

export const inLogin = new Subject<boolean>();

const getLatestTimestamp = (data: PointsWithStats[]) => {
  return Math.max(...data.map((item) => new Date(item.lastChanged).getTime()));
};

const isDataNewer = (data: PointsWithStats[]) => {
  return getLatestTimestamp(data) > getLatestTimestamp(points);
};

export const getPoints = async () => {
  try {
    const data = await client.query('getPoints');
    if (isDataNewer(data)) {
      points = data;
      const displayData = processData(points);
      dataSubject.next(displayData);
    }
    return dataSubject.value;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const addPoints = async (
  color: string,
  number: number,
  date?: Date,
  owner?: string,
  reason?: string
) => {
  try {
    if (!hasSession(true)) {
      authFailure.next();
    }
    const data = await client.mutation('addPoints', {
      color,
      number,
      sessionId: sessionId,
      userId: sessionUserId,
      date: date ? date.getTime() : undefined,
      owner: owner || undefined,
      reason: reason || undefined,
    });
    if (!data) {
      authFailure.next();
      return;
    }
    if (isDataNewer(data)) {
      points = data;
      const displayData = processData(points);
      dataSubject.next(displayData);
    }
    return dataSubject.value;
  } catch (e: unknown) {
    console.error(e);
    throw e;
  }
};

export const subscribePoints = () => {
  (async () => {
    try {
      await client.subscription('onPointsChanged', undefined, {
        onNext: (data) => {
          if (data.type === 'data') {
            const newData = data.data;
            if (isDataNewer(newData)) {
              points = newData;
              const displayData = processData(points);
              dataSubject.next(displayData);
            }
          }
        },
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  })();
  return dataSubject;
};

export const checkSessionAsync = async (admin = false) => {
  if (!hasSession(admin)) {
    authFailure.next();
    return false;
  }
  const data = await client.mutation('checkSession', {
    sessionId,
    userId: sessionUserId,
    admin: admin || isAdmin || undefined,
  });
  if (!data) {
    sessionId = '';
    sessionUserId = '';
    isAdmin = false;
    sessionExpires = 0;
    infosSet = false;
    houseConfirmed = undefined;
    current = false;
    localStorage.setItem('session', '');
    localStorage.setItem('sessionUserId', '');
    localStorage.setItem('sessionExpires', '');
    localStorage.setItem('admin', '');
    localStorage.setItem('infosSet', '');
    localStorage.setItem('houseConfirmed', '');
    localStorage.setItem('current', '');
    authFailure.next();
    return false;
  }
  return true;
};

export const checkSession = (admin = false) => {
  (async () => {
    try {
      await checkSessionAsync(admin);
    } catch (e: unknown) {
      console.error(e);
      throw e;
    }
  })();
};

export const register = async (email: string, captchaToken?: string) => {
  try {
    const result = await client.mutation('register', { email, captchaToken });
    return {
      success: result.success,
      showCaptcha: result.showCaptcha,
      nextTry: new Date(result.nextTry),
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const emailLogIn = async (email: string, captchaToken?: string) => {
  try {
    const result = await client.mutation('emailLogin', { email, captchaToken });
    return {
      success: result.success,
      showCaptcha: result.showCaptcha,
      nextTry: new Date(result.nextTry),
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const logIn = async (
  password: string,
  email?: string,
  captchaToken?: string
) => {
  try {
    const result = await client.mutation('login', {
      password,
      email,
      captchaToken,
    });
    if (result.success && result.sessionId) {
      sessionId = result.sessionId;
      isAdmin = !!result.admin;
      sessionUserId = result.userId ?? '';
      sessionExpires = Date.now() + 1000 * 60 * 60 * 23.5;
      infosSet = !!result.infosSet;
      houseConfirmed = result.houseConfirmed;
      current = !!result.current;
    }

    if (sessionId) {
      localStorage.setItem('sessionUserId', sessionUserId);
      localStorage.setItem('session', sessionId);
      localStorage.setItem('sessionExpires', sessionExpires.toString());
      localStorage.setItem('admin', isAdmin ? 'true' : '');
      localStorage.setItem('infosSet', infosSet ? 'true' : '');
      localStorage.setItem('houseConfirmed', houseConfirmed || '');
      localStorage.setItem('current', current ? 'true' : '');
    }
    return {
      success: result.success,
      admin: result.admin,
      infosSet: result.infosSet,
      houseConfirmed: result.houseConfirmed,
      current: result.current,
      showCaptcha: result.showCaptcha,
      nextTry: new Date(result.nextTry),
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const verify = async (userId: string, code: string) => {
  try {
    const result = await client.mutation('verify', {
      userId,
      code,
    });
    if (result.success && result.sessionId) {
      sessionId = result.sessionId;
      isAdmin = !!result.admin;
      sessionExpires = Date.now() + 1000 * 60 * 60 * 23.5;
      sessionUserId = userId ?? '';
      infosSet = !!result.infosSet;
      houseConfirmed = result.houseConfirmed;
      current = !!result.current;
      setCode = result.code ?? '';
      setExpired = Date.now() + 1000 * 60 * 25 ?? 0;
    }

    if (sessionId) {
      localStorage.setItem('sessionUserId', sessionUserId);
      localStorage.setItem('session', sessionId);
      localStorage.setItem('sessionExpires', sessionExpires.toString());
      localStorage.setItem('admin', isAdmin ? 'true' : '');
      localStorage.setItem('infosSet', infosSet ? 'true' : '');
      localStorage.setItem('houseConfirmed', houseConfirmed || '');
      localStorage.setItem('current', current ? 'true' : '');
    }
    return {
      success: result.success,
      admin: result.admin,
      infosSet: result.infosSet,
      houseConfirmed: result.houseConfirmed,
      current: result.current,
      code: result.code,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const set = async (newPassword: string, name: string) => {
  try {
    if (!hasSession()) {
      authFailure.next();
      return false;
    }
    if (!hasSetCode()) {
      await logOut();
      authFailure.next();
      return false;
    }

    const result = await client.mutation('setUserInfo', {
      userId: sessionUserId,
      password: newPassword,
      name,
      code: setCode,
      sessionId,
    });

    if (result) {
      userInfo = result;
      infosSet = !!result.infosSet;
      houseConfirmed = result.houseConfirmed;
      current = !!result.current;
      localStorage.setItem('infosSet', infosSet ? 'true' : '');
      localStorage.setItem('houseConfirmed', houseConfirmed || '');
      localStorage.setItem('current', current ? 'true' : '');
      clearSetCode();
    }
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const reset = async (newPassword?: string, name?: string) => {
  try {
    if (!hasSession()) {
      authFailure.next();
      return false;
    }
    if (!hasSetCode()) {
      await logOut();
      authFailure.next();
      return false;
    }

    const result = await client.mutation('resetUserInfo', {
      userId: sessionUserId,
      password: newPassword || undefined,
      name: name || undefined,
      code: setCode,
      sessionId,
    });

    if (result) {
      userInfo = result;
      infosSet = !!result.infosSet;
      houseConfirmed = result.houseConfirmed;
      current = !!result.current;
      localStorage.setItem('infosSet', infosSet ? 'true' : '');
      localStorage.setItem('houseConfirmed', houseConfirmed || '');
      localStorage.setItem('current', current ? 'true' : '');
      clearSetCode();
    }
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const change = async (
  password: string,
  newPassword?: string,
  name?: string
) => {
  try {
    if (!hasSession()) {
      authFailure.next();
      return false;
    }

    const result = await client.mutation('changeUserInfo', {
      userId: sessionUserId,
      password,
      newPassword: newPassword || undefined,
      name: name || undefined,
      sessionId,
    });

    if (result) {
      userInfo = result;
      infosSet = !!result.infosSet;
      houseConfirmed = result.houseConfirmed;
      current = !!result.current;
      localStorage.setItem('infosSet', infosSet ? 'true' : '');
      localStorage.setItem('houseConfirmed', houseConfirmed || '');
      localStorage.setItem('current', current ? 'true' : '');
    }
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const getUserInfo = async () => {
  try {
    if (!hasSession()) {
      authFailure.next();
      return false;
    }

    if (userInfo) {
      return userInfo;
    }

    const result = await client.query('getUserInfo', {
      userId: sessionUserId,
      sessionId,
    });

    if (result) {
      console.log(result);
      userInfo = result;
      infosSet = !!result.infosSet;
      houseConfirmed = result.houseConfirmed;
      current = !!result.current;
      localStorage.setItem('infosSet', infosSet ? 'true' : '');
      localStorage.setItem('houseConfirmed', houseConfirmed || '');
      localStorage.setItem('current', current ? 'true' : '');
    }
    return result;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const logOut = async () => {
  try {
    loggingOut = true;
    await client.mutation('logout', { sessionId, userId: sessionUserId });
    clearAll();
    sessionId = '';
    sessionUserId = '';
    isAdmin = false;
    sessionExpires = 0;
    infosSet = false;
    houseConfirmed = undefined;
    current = false;
    localStorage.setItem('sessionUserId', '');
    localStorage.setItem('session', '');
    localStorage.setItem('sessionExpires', '');
    localStorage.setItem('admin', '');
    localStorage.setItem('infosSet', '');
    localStorage.setItem('houseConfirmed', '');
    localStorage.setItem('current', '');
    loggingOut = false;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
