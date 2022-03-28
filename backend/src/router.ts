import * as trpc from '@trpc/server';
import { z } from 'zod';
import { COLORS, REFRESH_INTERVAL } from './constants';
import { addPoints, getPoints, Points } from './data';

import { Subject } from 'rxjs';

let dataChanged = false;
const dataChangedEvent = new Subject<Points []>();

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
  .mutation('addPoints', {
    input: z.object({
      color: z.string().nonempty().max(20),
      number: z.number().min(-1000).max(1000).int(),
      date: z.date().optional(),
      owner: z.string().nonempty().max(100).optional(),
      reason: z.string().nonempty().max(1000).optional(),
    }),
    async resolve({ input }) {
      if (!Object.keys(COLORS).includes(input.color)) {
        throw new Error('Color does not exist');
      } else {
        try {
          const points = await addPoints(input.color, input.number, input.date, input.owner, input.reason);
          dataChanged = true;
          return points;
        } catch (e: any) {
          console.error(e);
          process.exitCode = 1;
          throw new Error('Internal server error');
        }
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