import type { AppRouter } from '../../backend/src/router';
import { createWSClient, wsLink } from '@trpc/client/links/wsLink';
import { createTRPCClient } from '@trpc/client';
import { COLORS } from './constants';
import type { Points } from '../../backend/src/data';
import { BehaviorSubject, Subject } from 'rxjs';

const wsClient = createWSClient({
    url: 'wss://mll.one:3033/',
});

const client = createTRPCClient<AppRouter>({
    links: [
        wsLink({
          client: wsClient,
        }),
    ],
});

let points: Points[] = Object.keys(COLORS).map((item) => ({ color: item as keyof typeof COLORS, points: 0, lastChanged: new Date(0) }));

export type DisplayData = { color: string, colorString: string, points: number, relativePercentage: number, currentPercentage: number, badgeString: string, badgeClass?: string }[];

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
const maxGrowScale = 1.5;

let previousMaxIndex = 0;

const randomOrder: { [key: string]: number } = {};

let sessionId = localStorage.getItem('session') ?? '';

export const hasSessionId = () => {
    return !!sessionId;
};

const processData = (data: Points[], zero = false): DisplayData => {
    const highestPoints = Math.max(...data.map(item => item.points));

    let pointsMaxIndex = scale * highestPoints;
    if (previousMaxIndex) {
        if (pointsMaxIndex < previousMaxIndex * maxGrowScale) {
            pointsMaxIndex = previousMaxIndex;
        } else {
            pointsMaxIndex = pointsMaxIndex / maxGrowScale
        }
    }

    previousMaxIndex = pointsMaxIndex;

    if (!pointsMaxIndex) {
        pointsMaxIndex = 1;
    }
    
    const dataNormalizedArray: [string, number, number][] = data.map(item => [item.color, item.points / pointsMaxIndex, item.points]);

    dataNormalizedArray.sort((a, b) => {
        if (a[2] < b[2]) {
            return 1;
        }
        if (a[2] > b[2]) {
            return -1;
        }
        const previousRandom = randomOrder[a[0] + '-' + b[0]];
        if (previousRandom) {
            return 0;
        }
        const previousReverseRandom = randomOrder[b[0] + '-' + a[0]];
        if (previousReverseRandom) {
            return 0;
        }
        const random = Math.random();
        randomOrder[a[0] + '-' + b[0]] = random;
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
        const returnObject = { color: item[0], colorString: item[0].charAt(0).toUpperCase() + item[0].slice(1), points: item[2], relativePercentage: item[1] * 100, currentPercentage: zero ? 0 : dataSubject.value.find(prevItem => prevItem.color === item[0])?.currentPercentage ?? 0, badgeString, badgeClass };
        return returnObject;
    });

    return displayData;
}

export const zeroData = processData(points, true);

const dataSubject = new BehaviorSubject(zeroData);

export const authFailure = new Subject<void>();

export const inLogin = new Subject<boolean>();

const getLatestTimestamp = (data: Points[]) => {
    return Math.max(...data.map(item => (new Date(item.lastChanged)).getTime()));
}

const isDataNewer = (data: Points[]) => {
    return getLatestTimestamp(data) > getLatestTimestamp(points);
}

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

export const addPoints = async (color: string, number: number, date?: Date, owner?: string, reason?: string) => {
    try {
        if (!sessionId) {
            authFailure.next();
            throw new Error('no sessionId');
        }
        const data = await client.mutation('addPoints', { color, number, sessionId: sessionId, date: date ? date.getTime() : undefined, owner: owner || undefined, reason: reason || undefined });
        if (isDataNewer(data)) {
            points = data;
            const displayData = processData(points);
            dataSubject.next(displayData);
        }
        return dataSubject.value;
    } catch (e: any) {
        if (e.message === 'Incorrect sessionId') {
            authFailure.next();
            throw e;
        } else {
            console.error(e);
            throw e;
        }
        
    }
}

export const subscribePoints = () => {
    (async () => {
        try {
            await client.subscription('onPointsChanged', undefined, {
                onNext: data => {
                    if (data.type === 'data') {
                        const newData = data.data as Points[];
                        if (isDataNewer(newData)) {
                            points = newData;
                            const displayData = processData(points);
                            dataSubject.next(displayData);
                        }
                    }
                }
            });
        } catch (e) {
            console.error(e);
            throw e;
        }
    })();
    return dataSubject;
};

export const logIn = async (password: string) => {
    sessionId = await client.mutation('login', { password });
    if (sessionId) {
        localStorage.setItem('session', sessionId);
    }
    return !!sessionId;
};

export const logOut = () => {
    sessionId = '';
    localStorage.setItem('session', '');
};