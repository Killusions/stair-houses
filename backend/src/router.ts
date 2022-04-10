import * as trpc from '@trpc/server'
import { z } from 'zod'
import { COLORS, REFRESH_INTERVAL } from './constants.js'
import {
  addPoints,
  getPointsWithStats,
  makeId,
  Points,
  verifyPassword,
} from './data.js'

import { Subject } from 'rxjs'

let dataChanged = false
const dataChangedEvent = new Subject<Points[]>()

const sessions: { [key: string]: { expirationDate: Date; ip: string } } = {}

export const appRouter = trpc
  .router()
  .subscription('onPointsChanged', {
    resolve() {
      return new trpc.Subscription<Points[]>((emit) => {
        const onPointsIncrease = (data: Points[]) => {
          emit.data(data)
        }

        const sub = dataChangedEvent.subscribe((data: Points[]) => {
          onPointsIncrease(data)
        })

        return () => {
          sub.unsubscribe()
        }
      })
    },
  })
  .query('getPoints', {
    async resolve() {
      try {
        return await getPointsWithStats()
      } catch (e: unknown) {
        console.error(e)
        process.exitCode = 1
        throw new Error('Internal server error')
      }
    },
  })
  .mutation('login', {
    input: z.object({
      password: z.string().nonempty().max(20),
      captchaToken: z.string().nonempty().max(10000).optional(),
    }),
    async resolve({
      input,
      ctx,
    }): Promise<{ sessionId?: string; showCaptcha: boolean; nextTry: Date }> {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
        const ip = (ctx as any).req!.connection!.remoteAddress!
        const result = await verifyPassword(
          input.password,
          ip,
          input.captchaToken
        )
        if (result.success) {
          const sessionId = makeId(20)
          sessions[sessionId] = {
            expirationDate: new Date(
              new Date().getTime() + 1000 * 60 * 60 * 24
            ),
            ip,
          }
          Object.keys(sessions).forEach((id) => {
            if (sessions[id].expirationDate < new Date()) {
              delete sessions[id]
            }
          })
          return {
            sessionId,
            showCaptcha: result.showCaptcha,
            nextTry: result.nextTry,
          }
        }
        return { showCaptcha: result.showCaptcha, nextTry: result.nextTry }
      } catch (e: unknown) {
        console.error(e)
        process.exitCode = 1
        throw new Error('Internal server error')
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
      const ip = (ctx as any).req!.connection!.remoteAddress!
      const session = sessions[input.sessionId]
      if (session && session.ip === ip && session.expirationDate > new Date()) {
        if (!Object.keys(COLORS).includes(input.color)) {
          throw new Error('Color does not exist')
        } else {
          try {
            let date = input.date ? new Date(input.date) : undefined
            if (date && isNaN(date.getTime())) {
              date = undefined
            }
            const points = await addPoints(
              input.color,
              input.number,
              date,
              input.owner,
              input.reason
            )
            dataChanged = true
            return points
          } catch (e: unknown) {
            console.error(e)
            process.exitCode = 1
            throw new Error('Internal server error')
          }
        }
      } else {
        throw new Error('Incorrect sessionId')
      }
    },
  })
  .mutation('logout', {
    input: z.object({
      sessionId: z.string().length(20),
    }),
    async resolve({ input, ctx }) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
      const ip = (ctx as any).req!.connection!.remoteAddress!
      const session = sessions[input.sessionId]
      if (session && session.ip === ip) {
        delete sessions[input.sessionId]
      } else {
        throw new Error('Incorrect sessionId')
      }
    },
  })

setInterval(async () => {
  try {
    if (dataChanged) {
      dataChanged = false
      dataChangedEvent.next(await getPointsWithStats())
    }
  } catch (e: unknown) {
    console.error(e)
    process.exitCode = 1
    throw new Error('Internal server error')
  }
}, REFRESH_INTERVAL)

export type AppRouter = typeof appRouter
