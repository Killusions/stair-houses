import { Collection, Db, MongoClient } from 'mongodb';
import { COLORS } from './constants';

const rawDomain = process.env.STAIR_HOUSES_DATABASE_DOMAIN;
const domain = rawDomain ? encodeURIComponent(rawDomain) : 'localhost';
const rawPort = process.env.STAIR_HOUSES_DATABASE_PORT;
const port = rawPort ? encodeURIComponent(rawPort) : '27017';
const rawUser = process.env.STAIR_HOUSES_DATABASE_USER;
const user = rawUser ? encodeURIComponent(rawUser) : '';
const rawPassword = process.env.STAIR_HOUSES_DATABASE_PASSWORD;
const password = rawPassword ? encodeURIComponent(rawPassword) : '';
const authMechanism = user && password ? 'DEFAULT' : '';

// Connection URL
const url = authMechanism === 'DEFAULT' ? 'mongodb://' + user + ':' + password + '@' + domain + ':' + port + '?authMechanism=' + authMechanism : 'mongodb://' + domain + ':' + port ;
const client = new MongoClient(url);

// Database Name
const dbName = 'stairHouses';

const pointsCollectionName = 'points';
const pointEventsCollectionName = 'pointEvents';
const settingsCollectionName = 'settings';

export interface Points {
    color: keyof typeof COLORS;
    points: number;
    lastChanged: Date;
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
    value: any;
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

const makeId = (length: number) => {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

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
    return new Promise<void>(async (resolve) => {
        try {
            if (closing) {
                await ensureNoDBConnection();
            }
            closed = false;
            connecting = true;
            await client.connect();
            console.log('Connected successfully to server');
            db = client.db(dbName);
            pointsCollection = db.collection<Points>(pointsCollectionName);
            if (await pointsCollection.countDocuments() === 0) {
                await pointsCollection.insertMany(Object.keys(COLORS).map((color): Points => ({ color: color as keyof typeof COLORS, points: 0, lastChanged: new Date() })));
            }
            pointEventsCollection = db.collection<PointEvent>(pointEventsCollectionName);
            settingsCollection = db.collection<Setting>(settingsCollectionName);
            const passwordObject = await settingsCollection.findOne({ name: 'password', type: 'string' }) as StringSetting;
            let password: string;
            if (passwordObject) {
                password = passwordObject.value;
            } else {
                password = process.env.STAIR_HOUSES_DEFAULT_PASSWORD ?? makeId(10);
                await settingsCollection.insertOne({ key: 'password', value: password, type: 'string' });
            }
            Promise.resolve().then(() => {
                connectingWaitPromises.forEach(promiseFunc => promiseFunc());
                connected = true;
                connecting = false;
            });
            resolve();
        } catch (e: any) {
            console.error(e);
            process.exitCode = 1;
        }
    });
}

export const ensureNoDBConnection = (forGood = false) => {
    if (closed && (!forGood || closedForGood)) {
        return Promise.resolve();
    }
    if (closing) {
        if (forGood && !closingForGood) {
            closingForGood = true;
            connectingWaitPromises.forEach(promiseFunc => promiseFunc(true));
        }
        const promise = new Promise<void>((resolve) => {
            closingWaitPromises.push(() => resolve());
        });
        return promise;
    }
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
                closingWaitPromises.forEach(promiseFunc => promiseFunc());
                closed = true;
                closing = false;
                if (closingForGood) {
                    closedForGood = true;
                    closingForGood = false;
                }
            });
            resolve();
        } catch (e: any) {
            console.error(e);
            process.exitCode = 1;
        }
    });
}

export const getPoints = async () => {
    await ensureDBConnection();
    pointsCollection = pointsCollection as Collection<Points>;
    pointEventsCollection = pointEventsCollection as Collection<PointEvent>;
    settingsCollection = settingsCollection as Collection<Setting>;
    
    return await pointsCollection.find( {} ).toArray() as Points[];
}

export const addPoints = async (color: string, number: number, date?: Date, owner?: string, reason?: string) => {
    await ensureDBConnection();
    pointsCollection = pointsCollection as Collection<Points>;
    pointEventsCollection = pointEventsCollection as Collection<PointEvent>;
    settingsCollection = settingsCollection as Collection<Setting>;

    console.log(date, owner, reason);

    await pointsCollection.updateOne( { color: color as keyof typeof COLORS }, {
        $inc: { points: number },
        $currentDate: { lastChanged: true }
    });

    return await getPoints();
}