import * as trpc from '@trpc/server';
import { z } from 'zod';
import { COLORS, REFRESH_INTERVAL } from './constants';
import { addPoints, getPoints, makeId, Points, verifyPassword } from './data';

import { Subject } from 'rxjs';

let dataChanged = false;
const dataChangedEvent = new Subject<Points []>();

const sessions: { [key: string]: { expirationDate: Date, ip: string } } = {};

export const appRouter = trpc
  .router()
  .subscription('onPointsChanged', {
    resolve() {
      return new trpc.Subscription<Points[]>((emit) => {
        const onPointsIncrease = (data: Points[]) => {
          emit.data(data);
        };

        const sub = dataChangedEvent.subscribe((data: Points[]) => {
          onPointsIncrease(data);
        });

        return () => {
          sub.unsubscribe();
        };
      });
    },
  })
  .query('getPoints', {
    async resolve() {
      try {
        return await getPoints();
      } catch (e: any) {
        console.error(e);
        process.exitCode = 1;
        throw new Error('Internal server error');
      }
    },
  })
  .mutation('login', {
    input: z.object({
      password: z.string().nonempty().max(20),
    }),
    async resolve({ input, ctx }) {
      try {
        const correct = await verifyPassword(input.password);
        if (correct) {
          const sessionId = makeId(20);
          const ip = (ctx as any).req!.connection!.remoteAddress!;
          sessions[sessionId] = { expirationDate: new Date((new Date()).getTime() + 1000 * 60 * 60 * 24), ip};
          Object.keys(sessions).forEach(id => {
            if (sessions[id].expirationDate < new Date()) {
              delete sessions[id];
            }
          })
          return sessionId;
        }
        return '';
      } catch (e: any) {
        console.error(e);
        process.exitCode = 1;
        throw new Error('Internal server error');
      }
    },
  })
  .mutation('addPoints', {
    input: z.object({
      color: z.string().nonempty().max(20),
      number: z.number().min(-1000).max(1000).int(),
      sessionId: z.string().length(20),
      date: z.number().nonnegative().optional(),
      owner: z.string().nonempty().max(100).optional(),
      reason: z.string().nonempty().max(1000).optional(),
    }),
    async resolve({ input, ctx }) {
      const ip = (ctx as any).req!.connection!.remoteAddress!;
      const session = sessions[input.sessionId];
      if (session && session.ip === ip && session.expirationDate > new Date()) {
        if (!Object.keys(COLORS).includes(input.color)) {
          throw new Error('Color does not exist');
        } else {
          try {
            let date = input.date ? new Date(input.date) : undefined;
            if (date && isNaN(date.getTime())) {
              date = undefined;
            }
            const points = await addPoints(input.color, input.number, date, input.owner, input.reason);
            dataChanged = true;
            return points;
          } catch (e: any) {
            console.error(e);
            process.exitCode = 1;
            throw new Error('Internal server error');
          }
        }
      } else {
        throw new Error('Incorrect sessionId');
      }
    },
  });

setInterval(async () => {
  try {
    if (dataChanged) {
      dataChanged = false;
      dataChangedEvent.next(await getPoints());
    }
  } catch (e: any) {
    console.error(e);
    process.exitCode = 1;
    throw new Error('Internal server error');
  }
}, REFRESH_INTERVAL);

export type AppRouter = typeof appRouter;