import { Collection, Db, MongoClient } from 'mongodb';
import { COLORS } from './constants.js';
import { hash, verify } from 'argon2';
import hCaptcha from 'hcaptcha';
import cryptoRandomString from 'crypto-random-string';
import { captchaSecret, frontendHost } from './index.js';
import nodemailer from 'nodemailer';

const rawHost = process.env.STAIR_HOUSES_DATABASE_HOST;
const host = rawHost ? encodeURIComponent(rawHost) : 'localhost';
const rawPort = process.env.STAIR_HOUSES_DATABASE_PORT;
const port = rawPort ? encodeURIComponent(rawPort) : '27017';
const rawUser = process.env.STAIR_HOUSES_DATABASE_USER;
const user = rawUser ? encodeURIComponent(rawUser) : '';
const rawPassword = process.env.STAIR_HOUSES_DATABASE_PASSWORD;
const password = rawPassword ? encodeURIComponent(rawPassword) : '';
const authMechanism = user && password ? 'DEFAULT' : '';

const mailHostname = process.env.STAIR_HOUSES_MAIL_HOSTNAME;
const mailPort = parseInt(process.env.STAIR_HOUSES_MAIL_PORT ?? '') || 587;
const mailSecure =
  (!!process.env.STAIR_HOUSES_MAIL_SECURE &&
    process.env.STAIR_HOUSES_MAIL_SECURE.toLowerCase() !== 'false') ||
  false;
const mailUseTLS =
  (!!process.env.STAIR_HOUSES_MAIL_USE_TLS &&
    process.env.STAIR_HOUSES_MAIL_USE_TLS.toLowerCase() !== 'false') ||
  true;
const mailUsername = process.env.STAIR_HOUSES_MAIL_USERNAME;
const mailPassword = process.env.STAIR_HOUSES_MAIL_PASSWORD;
const mailAddress = process.env.STAIR_HOUSES_MAIL_ADDRESS;

const frontendPath = process.env.STAIR_HOUSES_FRONTEND_PATH ?? '/#';
const frontendProtocol =
  process.env.STAIR_HOUSES_FRONTEND_PROTOCOL ?? 'http://';

// Connection URL
const url =
  authMechanism === 'DEFAULT'
    ? 'mongodb://' +
      user +
      ':' +
      password +
      '@' +
      host +
      ':' +
      port +
      '?authMechanism=' +
      authMechanism
    : 'mongodb://' + host + ':' + port;
const client = new MongoClient(url);

// Database Name
const dbName = 'stairHouses';

const pointsCollectionName = 'points';
const pointEventsCollectionName = 'pointEvents';
const settingsCollectionName = 'settings';
const usersCollectionName = 'users';

const base64Encode = (msg: string) => {
  return Buffer.from(msg)
    .toString('base64')
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=/g, '~');
};

const base64Decode = (msg: string) => {
  return Buffer.from(
    msg.replace(/_/g, '/').replace(/-/g, '+').replace(/~/g, '='),
    'base64'
  ).toString('utf-8');
};

export interface Points {
  color: keyof typeof COLORS;
  points: number;
  lastChanged: Date;
}

export interface PointsCategory {
  name: string;
  amount: number;
}

export interface PointsWithStats extends Points {
  categories: PointsCategory[];
}

export interface PointEvent {
  color: string;
  pointsDiff: number;
  date: Date;
  addedDate: Date;
  addedBy?: string;
  owner?: string;
  reason?: string;
}

interface BaseSetting {
  key: string;
  value: unknown;
  type: string;
}

interface StringSetting extends BaseSetting {
  key: string;
  value: string;
  type: 'string';
}

interface NumberSetting extends BaseSetting {
  key: string;
  value: number;
  type: 'string';
}

interface DateSetting extends BaseSetting {
  key: string;
  value: Date;
  type: 'date';
}

interface SubSetting extends BaseSetting {
  key: string;
  value: Setting;
  type: 'sub';
}

interface User {
  email: string;
  registerDate: Date;
  name?: string;
  hash?: string;
  verifyHash?: string;
  verifyExpiration?: Date;
  verifyStay?: boolean;
  resetHash?: string;
  resetExpiration?: Date;
  lastLogin?: Date;
  verifyDate?: Date;
  changedDate?: Date;
}

type Setting = StringSetting | NumberSetting | DateSetting | SubSetting;

let connected = false;
let connecting = false;
let closing = false;
let closed = true;
let closingForGood = false;
let closedForGood = false;
const connectingWaitPromises: ((cancel?: boolean) => void)[] = [];
const closingWaitPromises: (() => void)[] = [];

let db: Db | undefined = undefined;
let pointsCollection: Collection<Points> | undefined = undefined;
let pointEventsCollection: Collection<PointEvent> | undefined = undefined;
let settingsCollection: Collection<Setting> | undefined = undefined;
let usersCollection: Collection<User> | undefined = undefined;

const passwordTries: Record<string, number> = {};
const passwordPreviousTimeOuts: Record<string, Date[]> = {};
const passwordTimeOuts: Record<string, Date> = {};
const passwordFailedCaptcha: Record<string, number> = {};

export const makeId = (length: number) => {
  return cryptoRandomString({ length, type: 'alphanumeric' });
};

export const ensureDBConnection = () => {
  if (connected) {
    return Promise.resolve();
  }
  if (connecting) {
    if (closingForGood || closedForGood) {
      throw new Error('Connection closed for good');
    }
    const promise = new Promise<void>((resolve, reject) => {
      connectingWaitPromises.push((cancel = false) => {
        if (cancel) {
          reject(new Error('Connection closed for good'));
        }
        resolve();
      });
    });
    return promise;
  }
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve) => {
    try {
      if (closing) {
        await ensureNoDBConnection();
      }
      closed = false;
      connecting = true;
      await client.connect();
      console.log('Connected successfully to database server');
      db = client.db(dbName);
      pointsCollection = db.collection<Points>(pointsCollectionName);
      if ((await pointsCollection.countDocuments()) === 0) {
        await pointsCollection.insertMany(
          Object.keys(COLORS).map(
            (color): Points => ({
              color: color as keyof typeof COLORS,
              points: 0,
              lastChanged: new Date(),
            })
          )
        );
      }
      pointEventsCollection = db.collection<PointEvent>(
        pointEventsCollectionName
      );
      settingsCollection = db.collection<Setting>(settingsCollectionName);
      usersCollection = db.collection<User>(usersCollectionName);

      const passwordObject = (await settingsCollection.findOne({
        key: 'password',
        type: 'string',
      })) as StringSetting;
      let password: string | undefined;
      if (passwordObject) {
        password = passwordObject.value;
      } else {
        password = process.env.STAIR_HOUSES_DEFAULT_PASSWORD;
        if (!password) {
          password = makeId(15);
          console.log('Generated password: ' + password);
        }
        const passwordHashed = await hash(password);
        await settingsCollection.insertOne({
          key: 'password',
          value: passwordHashed,
          type: 'string',
        });
      }
      Promise.resolve().then(() => {
        connectingWaitPromises.forEach((promiseFunc) => promiseFunc());
        connected = true;
        connecting = false;
      });
      resolve();
    } catch (e: unknown) {
      console.error(e);
      process.exitCode = 1;
    }
  });
};

export const ensureNoDBConnection = (forGood = false) => {
  if (closed && (!forGood || closedForGood)) {
    return Promise.resolve();
  }
  if (closing) {
    if (forGood && !closingForGood) {
      closingForGood = true;
      connectingWaitPromises.forEach((promiseFunc) => promiseFunc(true));
    }
    const promise = new Promise<void>((resolve) => {
      closingWaitPromises.push(() => resolve());
    });
    return promise;
  }
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve) => {
    try {
      if (connecting) {
        await ensureDBConnection();
      }
      db = undefined;
      connected = false;
      closing = true;
      if (forGood) {
        closingForGood = true;
      }
      await client.close();
      console.log('Successfully closed connection to server');
      Promise.resolve().then(() => {
        closingWaitPromises.forEach((promiseFunc) => promiseFunc());
        closed = true;
        closing = false;
        if (closingForGood) {
          closedForGood = true;
          closingForGood = false;
        }
      });
      resolve();
    } catch (e: unknown) {
      console.error(e);
      process.exitCode = 1;
    }
  });
};

export const timeOutCaptchaAndResponse = async (
  ip: string,
  captchaToken?: string,
  action?: () => Promise<[boolean, boolean]>,
  response?: boolean
): Promise<{
  success: boolean;
  showCaptcha: boolean;
  nextTry: Date;
  admin: boolean;
}> => {
  const timeOut = passwordTimeOuts[ip];
  let needsCaptcha = false;
  let previous = passwordPreviousTimeOuts[ip];
  let previousCount = 0;
  if (previous) {
    if (previous.length) {
      passwordPreviousTimeOuts[ip] = previous.filter(
        (item) => item > new Date(Date.now() - 1000 * 60 * 60 * 24)
      );
      if (!passwordPreviousTimeOuts[ip].length) {
        delete passwordPreviousTimeOuts[ip];
      }
      previous = passwordPreviousTimeOuts[ip];
      previousCount = previous?.length ?? 0;
    }
  }
  if (timeOut) {
    if (timeOut > new Date()) {
      return {
        success: false,
        showCaptcha: previousCount > 3,
        nextTry: timeOut,
        admin: false,
      };
    } else {
      delete passwordTimeOuts[ip];
      if (previousCount > 2) {
        needsCaptcha = true;
      }
    }
  }
  if (!passwordTries[ip]) {
    passwordTries[ip] = 0;
  }
  passwordTries[ip]++;
  if (passwordTries[ip] > 10) {
    if (!previous) {
      passwordPreviousTimeOuts[ip] = [];
      previous = passwordPreviousTimeOuts[ip];
    }
    let lengthInMin = 0;
    switch (previousCount) {
      case 0:
        lengthInMin = 1;
        break;
      case 1:
        lengthInMin = 5;
        break;
      case 2:
        lengthInMin = 20;
        break;
      case 3:
        lengthInMin = 60;
        break;
      case 4:
        lengthInMin = 180;
        break;
      case 5:
        lengthInMin = 540;
        break;
      default:
        lengthInMin = 1440;
        break;
    }
    const nextTry = new Date(new Date().getTime() + lengthInMin * 60 * 1000);
    passwordTimeOuts[ip] = nextTry;
    delete passwordTries[ip];
    previous.push(new Date());
    return {
      success: false,
      showCaptcha: previousCount > 2,
      nextTry,
      admin: false,
    };
  } else if (
    passwordTries[ip] === 4 ||
    passwordTries[ip] === 7 ||
    passwordTries[ip] === 9
  ) {
    needsCaptcha = true;
  }
  if (passwordFailedCaptcha[ip]) {
    needsCaptcha = true;
  }
  if (needsCaptcha && captchaSecret) {
    const captcha =
      captchaToken && (await hCaptcha.verify(captchaSecret, captchaToken));
    if (!captcha) {
      if (passwordFailedCaptcha[ip]) {
        passwordFailedCaptcha[ip]++;
      } else {
        passwordFailedCaptcha[ip] = 1;
      }
      return {
        success: false,
        showCaptcha: true,
        nextTry: new Date(),
        admin: false,
      };
    } else {
      delete passwordFailedCaptcha[ip];
    }
  }

  const result = action ? await action() : [!!response, false];
  if (result[0]) {
    delete passwordTries[ip];
    delete passwordFailedCaptcha[ip];
    return {
      success: true,
      showCaptcha:
        passwordTries[ip] === 3 ||
        passwordTries[ip] === 6 ||
        passwordTries[ip] === 8,
      nextTry: new Date(),
      admin: result[1],
    };
  }
  return {
    success: false,
    showCaptcha:
      passwordTries[ip] === 3 ||
      passwordTries[ip] === 6 ||
      passwordTries[ip] === 8,
    nextTry: new Date(),
    admin: false,
  };
};

const mailTransporter =
  mailHostname && mailHostname && mailPassword && mailAddress
    ? nodemailer.createTransport({
        host: mailHostname,
        port: mailPort,
        secure: mailSecure,
        requireTLS: mailUseTLS,
        auth: {
          user: mailUsername,
          pass: mailPassword,
        },
        logger: true,
      })
    : null;

export const sendMail = async (
  to: string,
  subject: string,
  body: string,
  html?: string
) => {
  if (mailTransporter) {
    await mailTransporter.sendMail({
      from: '"STAIR" <' + mailAddress + '>',
      to,
      subject,
      text: body,
      html,
    });
  } else {
    console.log(
      'Missing mail configuration, instead printing mail here for testing purposes'
    );
    console.log(
      'Mail would have been sent to ' +
        to +
        ': ' +
        subject +
        '; ' +
        body +
        ' | ' +
        html
    );
  }
};

export const changePasswordOrName = async (
  email: string,
  password: string,
  newPassword?: string,
  name?: string
) => {
  if (!newPassword && !name) {
    return false;
  }

  if (!email || !email.endsWith('@stud.hslu.ch')) {
    return false;
  }

  await ensureDBConnection();
  usersCollection = usersCollection as Collection<User>;

  const registeredUser = await usersCollection.findOne({ email });
  if (!registeredUser || !registeredUser.hash) {
    return false;
  }

  if (await verify(password, registeredUser.hash)) {
    const passwordHashed = newPassword ? hash(newPassword) : '';

    await usersCollection.updateOne(
      {
        email,
      },
      {
        ...(passwordHashed ? { hash: passwordHashed } : {}),
        ...(name ? { name } : {}),
        $currentDate: { changedDate: true },
      }
    );
    return email;
  }

  return false;
};

export const setPasswordOrName = async (
  email: string,
  code: string,
  newPassword?: string,
  name?: string
) => {
  if (!newPassword && !name) {
    return false;
  }

  if (!email || !email.endsWith('@stud.hslu.ch')) {
    return false;
  }

  await ensureDBConnection();
  usersCollection = usersCollection as Collection<User>;

  const registeredUser = await usersCollection.findOne({ email });
  if (
    !registeredUser ||
    !registeredUser.resetHash ||
    !registeredUser.resetExpiration
  ) {
    return false;
  }

  if (registeredUser.resetExpiration < new Date()) {
    await usersCollection.updateOne(
      {
        email,
      },
      {
        $unset: { resetHash: true, resetExpiration: true },
      }
    );
    return false;
  }

  const codeDecoded = base64Decode(code);
  if (codeDecoded && (await verify(codeDecoded, registeredUser.resetHash))) {
    const passwordHashed = newPassword ? hash(newPassword) : '';

    await usersCollection.updateOne(
      {
        email,
      },
      {
        ...(passwordHashed ? { hash: passwordHashed } : {}),
        ...(name ? { name } : {}),
        $unset: { resetHash: true, resetExpiration: true },
        $currentDate: { changedDate: true },
      }
    );
    return email;
  } else {
    return false;
  }
};

export const verifyUser = async (
  emailEncoded: string,
  code: string
): Promise<[string | boolean, boolean]> => {
  const email = base64Decode(emailEncoded);

  if (!email || !email.endsWith('@stud.hslu.ch')) {
    return [false, false];
  }

  await ensureDBConnection();
  usersCollection = usersCollection as Collection<User>;

  const registeredUser = await usersCollection.findOne({ email });
  if (
    !registeredUser ||
    !registeredUser.verifyHash ||
    !registeredUser.verifyExpiration
  ) {
    return [false, false];
  }

  if (registeredUser.verifyExpiration < new Date()) {
    await usersCollection.updateOne(
      {
        email,
      },
      {
        $unset: { verifyHash: true, verifyExpiration: true, verifyStay: true },
      }
    );
    return [false, false];
  }

  const codeDecoded = base64Decode(code);
  if (codeDecoded && (await verify(codeDecoded, registeredUser.verifyHash))) {
    const passwordNew = makeId(15);
    const passwordHashed = await hash(passwordNew);
    await usersCollection.updateOne(
      {
        email,
      },
      {
        resetHash: passwordHashed,
        resetExpiration: new Date(Date.now() + 1000 * 60 * 30),
        $unset: { verifyHash: true, verifyExpiration: true, verifyStay: true },
        $currentDate: {
          lastLogin: true,
          ...(registeredUser.verifyDate ? {} : { verifyDate: true }),
        },
      }
    );
    return [email, !!registeredUser.verifyStay];
  } else {
    return [false, false];
  }
};

export const createLoginLink = async (email: string, stay = false) => {
  if (!email.endsWith('@stud.hslu.ch')) {
    return false;
  }

  await ensureDBConnection();
  usersCollection = usersCollection as Collection<User>;

  const registeredUser = await usersCollection.findOne({ email });
  if (!registeredUser) {
    return false;
  }

  const passwordNew = makeId(15);
  const passwordHashed = await hash(passwordNew);

  const link = `${
    frontendProtocol + frontendHost + frontendPath
  }/link?email=${base64Encode(email)}&code=${base64Encode(passwordNew)}`;

  await usersCollection.updateOne(
    {
      email,
    },
    {
      verifyHash: passwordHashed,
      verifyExpiration: new Date(Date.now() + 1000 * 60 * 30),
      verifyStay: stay,
      $currentDate: { lastChanged: true },
    }
  );

  return link;
};

export const registerOrEmailLogin = async (
  email: string,
  ip: string,
  captchaToken?: string,
  stay = false,
  isRegister = true
) => {
  if (!email.endsWith('@stud.hslu.ch')) {
    return await timeOutCaptchaAndResponse(ip, captchaToken, undefined, false);
  }

  return await timeOutCaptchaAndResponse(ip, captchaToken, async () => {
    await ensureDBConnection();
    usersCollection = usersCollection as Collection<User>;

    const registeredUser = await usersCollection.findOne({ email });
    if (!!registeredUser?.verifyDate === isRegister) {
      return [false, false];
    }

    const passwordNew = makeId(15);
    const passwordHashed = await hash(passwordNew);
    if (isRegister) {
      await usersCollection.insertOne({
        email,
        verifyHash: passwordHashed,
        verifyExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24),
        verifyStay: stay,
        registerDate: new Date(),
      });
      await usersCollection.deleteMany({
        email,
        verifyExpiration: { $lte: new Date() },
        $exists: { verifyHash: true, hash: false },
      });
    } else {
      await usersCollection.updateOne(
        {
          email,
        },
        {
          verifyHash: passwordHashed,
          verifyExpiration: new Date(Date.now() + 1000 * 60 * 60),
          verifyStay: stay,
          $currentDate: { lastChanged: true },
        }
      );
    }

    const body = isRegister
      ? `Welcome to the STAIR Houses website.

  To confirm your account just press the following link within the next 24 hours: ${
    frontendProtocol + frontendHost + frontendPath
  }/verify?email=${base64Encode(email)}&code=${base64Encode(passwordNew)}

  If you did not request this email, simply ignore it.`
      : `Welcome back to the STAIR Houses website.

  To log in just press the following link within the next hour: ${
    frontendProtocol + frontendHost + frontendPath
  }/link?email=${base64Encode(email)}&code=${base64Encode(passwordNew)}

  If you did not request this email, simply ignore it.`;

    await sendMail(
      email,
      'STAIR Houses ' + (isRegister ? 'Verification' : 'Login'),
      body
    );
    return [true, false];
  });
};

export const verifyPassword = async (
  password: string,
  ip: string,
  captchaToken?: string
) => {
  return await timeOutCaptchaAndResponse(ip, captchaToken, async () => {
    await ensureDBConnection();
    settingsCollection = settingsCollection as Collection<Setting>;

    const hashedPasswordObject = (await settingsCollection.findOne({
      key: 'password',
      type: 'string',
    })) as StringSetting;
    if (hashedPasswordObject) {
      const result = await verify(hashedPasswordObject.value, password);
      if (result) {
        return [true, true];
      }
    }
    return [false, false];
  });
};

export const loginUser = async (
  email: string,
  password: string,
  ip: string,
  captchaToken?: string
) => {
  if (!email.endsWith('@stud.hslu.ch')) {
    return await timeOutCaptchaAndResponse(ip, captchaToken, undefined, false);
  }

  return await timeOutCaptchaAndResponse(ip, captchaToken, async () => {
    await ensureDBConnection();
    usersCollection = usersCollection as Collection<User>;

    const user = await usersCollection.findOne({
      email,
    });
    if (user && user.hash) {
      const result = await verify(user.hash, password);
      if (result) {
        return [true, false];
      }
    }
    return [false, false];
  });
};

export const getPoints = async () => {
  await ensureDBConnection();
  pointsCollection = pointsCollection as Collection<Points>;

  return (await pointsCollection.find({}).toArray()) as Points[];
};

export const getPointsWithStats = async () => {
  await ensureDBConnection();
  pointsCollection = pointsCollection as Collection<Points>;
  pointEventsCollection = pointEventsCollection as Collection<PointEvent>;

  const points = (await pointsCollection.find({}).toArray()) as Points[];
  const events = (await pointEventsCollection
    .find({})
    .toArray()) as PointEvent[];

  const pointsWithStats: PointsWithStats[] = points.map((item) => {
    const pointsCategories: Record<string, number> = {};
    events
      .filter((event) => event.color === item.color)
      .forEach((event) => {
        if (pointsCategories[event.reason || 'General']) {
          pointsCategories[event.reason || 'General'] += event.pointsDiff;
        } else {
          pointsCategories[event.reason || 'General'] = event.pointsDiff;
        }
      });
    const categoriesArray: PointsCategory[] = Object.keys(pointsCategories).map(
      (key) => {
        return { name: key, amount: pointsCategories[key] };
      }
    );
    return { ...item, categories: categoriesArray };
  });
  return pointsWithStats;
};

export const addPoints = async (
  color: string,
  number: number,
  date?: Date,
  owner?: string,
  reason?: string
) => {
  await ensureDBConnection();
  pointsCollection = pointsCollection as Collection<Points>;
  pointEventsCollection = pointEventsCollection as Collection<PointEvent>;

  await pointsCollection.updateOne(
    { color: color as keyof typeof COLORS },
    {
      $inc: { points: number },
      $currentDate: { lastChanged: true },
    }
  );

  await pointEventsCollection.insertOne({
    color: color as keyof typeof COLORS,
    pointsDiff: number,
    date: date ?? new Date(),
    addedDate: new Date(),
    addedBy: 'Web',
    owner,
    reason,
  });

  return await getPointsWithStats();
};
