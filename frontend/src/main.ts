import './style.scss';

// pages/index.tsx
import type { AppRouter } from '../../backend/dist/router';
import { createTRPCClient } from '@trpc/client';

const client = createTRPCClient<AppRouter>({
  url: 'http://localhost:3030/trpc',
});

(async () => {
  const user = await client.mutation('createUser', { name: 'hans', bio: 'dfasdf' });
  console.log(user);

  const userAgain = await client.query('getUserById', user.id);
  console.log(userAgain);
})();

const data = {
  red: 0,
  blue: 0,
  purple: 0,
  grey: 0,
  orange: 0,
  yellow: 0
};

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

const logo = document.querySelector('.logo');
if (logo) {
  logo.addEventListener('click', () => window.location.replace('/'))
}
const highestPoints = Math.max(...Object.values(data));

const pointsMaxIndex = scale * highestPoints;

document.querySelector('.loading')?.classList.add('hide');

const dataNormalizedArray: [string, number, number][] = Object.keys(data).map(key => [key, data[key as keyof typeof data] / pointsMaxIndex, data[key as keyof typeof data]]);

const randomOrder: {[key: string]: number} = {};

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

dataNormalizedArray.forEach((item, index) => {
const originalElement = document.querySelector('.container .' + item[0]);
if (originalElement) {
  const element = originalElement as HTMLElement;
  element.style.gridArea = String.fromCharCode(index + 97);

const originalPoints = element.querySelector('.points');
if (originalPoints) {
  const points = originalPoints as HTMLElement;

  points.style.height = (item[1] * 100) + '%';

  points.style.transition = 'height 2s';
}

const originalScoreNumberElement = element.querySelector('.name .score .number');
if (originalScoreNumberElement) {
  const scoreNumberElement = originalScoreNumberElement as HTMLElement;
  scoreNumberElement.innerText = item[2].toString();
}

const originalBadge = element.querySelector('.name .score .badge');
if (originalBadge) {
  const badge = originalBadge as HTMLElement;

  if (item[2] === previousScore) {
    badge.innerText = previousPlaceString;
  } else {
    if (lastString && (item[2] === 0 || index === dataNormalizedArray.length - 1 || !dataNormalizedArray.slice(index).find(searchItem => searchItem[2] < item[2]))) {
      previousPlaceString = lastString;
    } else {
      previousPlaceString = placesStrings[index] ?? '';
    }
    badge.innerText = previousPlaceString;
    previousScore = item[2];
  }
  
  if (placesStrings[0] === previousPlaceString) {
    badge.classList.add('first');
  } else if (placesStrings[1] === previousPlaceString) {
    badge.classList.add('second');
  } else if (placesStrings[2] === previousPlaceString) {
    badge.classList.add('third');
  } else if (lastString && lastString === previousPlaceString) {
    badge.classList.add('last');
  }
}
}
});