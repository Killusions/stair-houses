import type { AppRouter } from '../../backend/src/router';
import { createWSClient, wsLink } from '@trpc/client/links/wsLink';
import { createTRPCClient } from '@trpc/client';
import { COLORS } from './constants';
import type { PointsCategory, PointsWithStats } from '../../backend/src/data';
import { BehaviorSubject, Subject } from 'rxjs';

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
});

let points: PointsWithStats[] = Object.keys(COLORS).map((item) => ({
  color: item as keyof typeof COLORS,
  points: 0,
  lastChanged: new Date(0),
  categories: [],
}));

export interface DisplayColor {
  color: string;
  colorString: string;
  points: number;
  relativePercentage: number;
  currentPercentage: number;
  badgeString: string;
  badgeClass?: string;
  categories: PointsCategory[];
}

export type DisplayData = DisplayColor[];

const placesStrings = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

const lastString = '';

const scale = 2.1;
const maxGrowScale = 1.5;

let previousMaxIndex = 0;

const randomOrder: { [key: string]: number } = {};

let sessionExpires =
  parseInt(localStorage.getItem('sessionExpires') ?? '') ?? 0;

let sessionId = localStorage.getItem('session') ?? '';

export const hasSessionId = () => {
  return !!sessionId && sessionExpires > new Date().getTime();
};

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
    const returnObject: DisplayColor = {
      color: item.color,
      colorString: item.color.charAt(0).toUpperCase() + item.color.slice(1),
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

export const authFailure = new Subject<void>();

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
    if (!sessionId) {
      authFailure.next();
      throw new Error('no sessionId');
    }
    const data = await client.mutation('addPoints', {
      color,
      number,
      sessionId: sessionId,
      date: date ? date.getTime() : undefined,
      owner: owner || undefined,
      reason: reason || undefined,
    });
    if (isDataNewer(data)) {
      points = data;
      const displayData = processData(points);
      dataSubject.next(displayData);
    }
    return dataSubject.value;
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Incorrect sessionId') {
      authFailure.next();
      throw e;
    } else {
      console.error(e);
      throw e;
    }
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

export const logIn = async (password: string, captchaToken?: string) => {
  const result = await client.mutation('login', { password, captchaToken });
  if (result.sessionId) {
    sessionId = result.sessionId;
  } else {
    sessionId = '';
  }
  sessionExpires = new Date().getTime() + 1000 * 60 * 60 * 23.5;
  if (sessionId) {
    localStorage.setItem('session', sessionId);
    localStorage.setItem('sessionExpires', sessionExpires.toString());
  }
  return {
    success: !!sessionId,
    showCaptcha: result.showCaptcha,
    nextTry: new Date(result.nextTry),
  };
};

export const logOut = async () => {
  await client.mutation('logout', { sessionId });
  sessionId = '';
  sessionExpires = 0;
  localStorage.setItem('session', '');
  localStorage.setItem('sessionExpires', '');
};
