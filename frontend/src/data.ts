import type { AppRouter } from '../../backend/src/router';
import { createWSClient, wsLink } from '@trpc/client/links/wsLink';
import { createTRPCClient } from '@trpc/client';
import { COLORS } from './constants';
import type { Points } from '../../backend/src/data';
import { BehaviorSubject } from 'rxjs';

const wsClient = createWSClient({
    url: 'ws://localhost:3030/trpc',
});

const client = createTRPCClient<AppRouter>({
    links: [
        wsLink({
          client: wsClient,
        }),
    ],
});

let points: Points[] = Object.keys(COLORS).map((item) => ({ color: item as keyof typeof COLORS, points: 0, lastChanged: new Date(0) }));

export type DisplayData = { color: string, colorString: string, points: number, relativePercentage: number, badgeString: string, badgeClass?: string }[];

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

const processData = (data: Points[]): DisplayData => {
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
    const dataNormalizedArray: [string, number, number][] = data.map(item => [item.color, item.points / pointsMaxIndex, item.points]);

    dataNormalizedArray.sort((a, b) => {
        if (a[1] < b[1]) {
            return 1;
        }
        if (a[1] > b[1]) {
            return -1;
        }
        const previousRandom = randomOrder[a[0] + '-' + b[0]];
        if (previousRandom) {
            console.log('previous random');
            return 0;
        } else {
            const random = Math.random();
            randomOrder[a[0] + '-' + b[0]] = random;
            if (random < 0.5) {
                return 1;
            } else {
                return -1;
            }
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
        return { color: item[0], colorString: item[0].charAt(0).toUpperCase() + item[0].slice(1), points: item[2], relativePercentage: item[1] * 100, badgeString, badgeClass };
    });

    return displayData;
}

export const zeroData = processData(points);

const dataSubject = new BehaviorSubject(zeroData);

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

export const addPoints = async (color: string, number: number) => {
    try {
        const data = await client.mutation('addPoints', { color, number });
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