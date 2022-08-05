import * as trpc from '@trpc/server';
import { z } from 'zod';
import { COLORS, REFRESH_INTERVAL } from './constants.js';
import { Subject } from 'rxjs';
import type { PointsWithStats } from './model';
import superjson from 'superjson';
import { makeId } from './id.js';
import { addPoints, getPointsWithStats } from './points.js';
import {
  createLoginLink,
  loginUser,
  registerOrEmailLogin,
  verifyUserEmail,
  verifyAdminPassword,
  getUserInfo,
  setUserInfo,
  changeUserInfo,
  resetUserInfo,
  getUserMail,
} from './users.js';
import { Context } from './context.js';
import { addCode, getCurrentCode, redeemCode } from './codes.js';

let dataChanged = false;
const dataChangedEvent = new Subject<PointsWithStats[]>();

let adminSessions: {
  [key: string]: { expirationDate: Date; ip: string; adminId: string };
} = {};

const sessions: {
  [key: string]: {
    expirationDate: Date;
    userId: string;
    ip?: string;
    infosSet?: boolean;
    currentHouse?: keyof typeof COLORS;
  };
} = {};

const addSession = (
  ip: string,
  userId: string,
  stay = false,
  isAdmin = false,
  infosSet?: boolean,
  currentHouse?: keyof typeof COLORS
) => {
  let sessionId = '';
  if (!userId) {
    return '';
  }
  if (isAdmin) {
    do {
      sessionId = makeId(20);
    } while (adminSessions[sessionId]);
    adminSessions[sessionId] = {
      expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      ip,
      adminId: userId,
    };
  } else {
    do {
      sessionId = makeId(20);
    } while (sessions[sessionId]);
    sessions[sessionId] = {
      expirationDate: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * (stay ? 90 : 1)
      ),
      ip: stay ? undefined : ip,
      userId,
      infosSet,
      currentHouse,
    };
  }
  Object.keys(sessions).forEach((id) => {
    if (sessions[id].expirationDate.getTime() < Date.now()) {
      delete sessions[id];
    }
  });
  Object.keys(adminSessions).forEach((id) => {
    if (adminSessions[id].expirationDate.getTime() < Date.now()) {
      delete adminSessions[id];
    }
  });
  return sessionId;
};

const verifySession = (
  sessionId: string,
  ip: string,
  userId: string,
  admin = false
) => {
  if (!userId) {
    return false;
  }
  if (admin) {
    const session = adminSessions[sessionId];
    return (
      session &&
      session.ip === ip &&
      session.expirationDate.getTime() > Date.now() &&
      session.adminId === userId
    );
  } else {
    const session = sessions[sessionId];
    return (
      session &&
      (!session.ip || session.ip === ip) &&
      session.expirationDate.getTime() > Date.now() &&
      session.userId === userId
    );
  }
};

const getSessionData = (sessionId: string) => {
  const session = sessions[sessionId];
  if (session) {
    return {
      infosSet: session.infosSet,
      currentHouse: session.currentHouse,
    };
  }
  return null;
};

const getSetSession = (sessionId: string, ip: string, userId: string) => {
  if (verifySession(sessionId, ip, userId)) {
    const sessionData = getSessionData(sessionId);
    if (sessionData && sessionData.infosSet) {
      return sessionData;
    }
  }
  return null;
};

const updateSessionData = (
  sessionId: string,
  infosSet = false,
  currentHouse?: keyof typeof COLORS
) => {
  if (sessions[sessionId]) {
    sessions[sessionId].infosSet = infosSet;
    sessions[sessionId].currentHouse = currentHouse;
  }
};

const deleteSessions = (
  sessionId: string,
  ip: string,
  userId: string,
  all = false,
  admin = false
) => {
  if (!userId) {
    return false;
  }
  if (verifySession(sessionId, ip, userId, admin)) {
    if (admin) {
      if (all) {
        adminSessions = {};
      } else {
        delete adminSessions[sessionId];
      }
      return true;
    } else {
      if (all) {
        Object.keys(sessions).forEach((id) => {
          const session = sessions[id];
          if (session.userId === userId) {
            delete sessions[id];
          }
        });
      } else {
        delete sessions[sessionId];
      }
    }
  }
  return false;
};

const getIp = (ctx: Context): string => {
  if (!ctx) {
    throw new Error('Could not get context to get IP');
  }
  const ip = ctx.req.socket.remoteAddress;
  if (!ip) {
    throw new Error('Could not get IP');
  }
  return ip;
};

const internalServerError = (e: unknown) => {
  console.error(e);
  process.exitCode = 1;
  return new Error('Internal server error');
};

export const appRouter = trpc
  .router()
  .transformer(superjson)
  .subscription('onPointsChanged', {
    resolve() {
      return new trpc.Subscription<PointsWithStats[]>((emit) => {
        const onPointsIncrease = (data: PointsWithStats[]) => {
          emit.data(data);
        };

        const sub = dataChangedEvent.subscribe((data: PointsWithStats[]) => {
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
        return await getPointsWithStats();
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .query('getLoginLink', {
    input: z.object({
      userId: z.string().nonempty().length(20),
      sessionId: z.string().length(20),
      stay: z.boolean().optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (getSetSession(input.sessionId, ip, input.userId)) {
          return await createLoginLink(input.userId, input.stay);
        }
        return false;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .query('getUserInfo', {
    input: z.object({
      userId: z.string().nonempty().length(20),
      sessionId: z.string().length(20),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (verifySession(input.sessionId, ip, input.userId)) {
          const info = await getUserInfo(input.userId);
          if (info) {
            updateSessionData(
              input.sessionId,
              info.infosSet,
              info.currentHouse
            );
            return info;
          }
        }
        return null;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('register', {
    input: z.object({
      email: z.string().email().nonempty().max(200),
      captchaToken: z.string().nonempty().max(10000).optional(),
      stay: z.boolean().optional(),
    }),
    async resolve({
      input,
      ctx,
    }): Promise<{ success: boolean; showCaptcha: boolean; nextTry: Date }> {
      try {
        const ip = getIp(ctx as Context);
        const result = await registerOrEmailLogin(
          input.email,
          ip,
          input.captchaToken,
          input.stay
        );
        return {
          success: result.success,
          showCaptcha: result.showCaptcha,
          nextTry: result.nextTry,
        };
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('emailLogin', {
    input: z.object({
      email: z.string().email().nonempty().max(200),
      captchaToken: z.string().nonempty().max(10000).optional(),
      stay: z.boolean().optional(),
    }),
    async resolve({ input, ctx }): Promise<{
      success: boolean;
      showCaptcha: boolean;
      nextTry: Date;
      admin?: boolean;
    }> {
      try {
        const ip = getIp(ctx as Context);
        return await registerOrEmailLogin(
          input.email,
          ip,
          input.captchaToken,
          input.stay,
          false
        );
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('verify', {
    input: z.object({
      userId: z.string().nonempty().length(20),
      code: z.string().nonempty().length(15),
    }),
    async resolve({ input, ctx }): Promise<{
      success: boolean;
      userId?: string;
      sessionId?: string;
      admin?: boolean;
      code?: string;
      infosSet?: boolean;
      currentHouse?: keyof typeof COLORS;
    }> {
      try {
        const result = await verifyUserEmail(input.userId, input.code);
        if (result.success) {
          const ip = getIp(ctx as Context);
          const sessionId = addSession(
            ip,
            input.userId,
            result.stay,
            result.admin,
            result.infosSet,
            result.currentHouse
          );
          return {
            success: result.success,
            userId: input.userId,
            sessionId,
            admin: result.admin,
            code: result.resetCode,
            infosSet: result.infosSet,
            currentHouse: result.currentHouse,
          };
        }
        return { success: false };
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('setUserInfo', {
    input: z.object({
      userId: z.string().nonempty().length(20),
      code: z.string().nonempty().length(15),
      sessionId: z.string().length(20),
      password: z.string().nonempty().max(20),
      name: z.string().nonempty().max(200),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (verifySession(input.sessionId, ip, input.userId)) {
          const result = await setUserInfo(
            input.userId,
            input.code,
            input.password,
            input.name
          );
          if (result) {
            updateSessionData(input.sessionId, true);
            return await getUserInfo(input.userId);
          }
        }
        return null;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('resetUserInfo', {
    input: z.object({
      userId: z.string().nonempty().length(20),
      code: z.string().nonempty().length(15),
      sessionId: z.string().length(20),
      password: z.string().nonempty().max(20).optional(),
      name: z.string().nonempty().max(200).optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (getSetSession(input.sessionId, ip, input.userId)) {
          const result = await resetUserInfo(
            input.userId,
            input.code,
            input.password,
            input.name
          );

          if (result) {
            const userInfo = await getUserInfo(input.userId);
            updateSessionData(
              input.sessionId,
              true,
              userInfo ? userInfo.currentHouse : undefined
            );
            return userInfo;
          }
        }
        return null;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('changeUserInfo', {
    input: z.object({
      userId: z.string().nonempty().length(20),
      sessionId: z.string().length(20),
      password: z.string().nonempty().max(20),
      newPassword: z.string().nonempty().max(20).optional(),
      name: z.string().nonempty().max(200).optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (getSetSession(input.sessionId, ip, input.userId)) {
          const result = await changeUserInfo(
            input.userId,
            input.password,
            input.newPassword,
            input.name
          );

          if (result) {
            const userInfo = await getUserInfo(input.userId);
            updateSessionData(
              input.sessionId,
              true,
              userInfo ? userInfo.currentHouse : undefined
            );
            return userInfo;
          }
        }
        return null;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('login', {
    input: z.object({
      email: z.string().email().nonempty().max(200).optional(),
      password: z.string().nonempty().max(20),
      captchaToken: z.string().nonempty().max(10000).optional(),
      stay: z.boolean().optional(),
    }),
    async resolve({ input, ctx }): Promise<{
      success: boolean;
      sessionId?: string;
      showCaptcha: boolean;
      nextTry: Date;
      admin?: boolean;
      userId?: string;
      infosSet?: boolean;
      currentHouse?: keyof typeof COLORS;
    }> {
      try {
        const ip = getIp(ctx as Context);
        const result = input.email
          ? await loginUser(input.email, input.password, ip, input.captchaToken)
          : await verifyAdminPassword(input.password, ip, input.captchaToken);
        if (result.success && result.userId) {
          if (result.admin) {
            const sessionId = addSession(ip, result.userId, input.stay, true);
            return {
              success: true,
              sessionId,
              showCaptcha: result.showCaptcha,
              nextTry: result.nextTry,
              admin: true,
              userId: result.userId,
              infosSet: result.infosSet,
              currentHouse: result.currentHouse,
            };
          } else {
            const sessionId = addSession(
              ip,
              result.userId,
              input.stay,
              false,
              result.infosSet,
              result.currentHouse
            );
            return {
              success: true,
              sessionId,
              showCaptcha: result.showCaptcha,
              nextTry: result.nextTry,
              userId: result.userId,
              infosSet: result.infosSet,
              currentHouse: result.currentHouse,
            };
          }
        }
        return {
          success: false,
          showCaptcha: result.showCaptcha,
          nextTry: result.nextTry,
        };
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('addPoints', {
    input: z.object({
      color: z.string().nonempty().max(20),
      number: z.number().min(-1000).max(1000).int(),
      sessionId: z.string().length(20),
      userId: z.string().length(20),
      date: z.number().nonnegative().optional(),
      owner: z.string().nonempty().max(100).optional(),
      reason: z.string().nonempty().max(1000).optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (
          Object.keys(COLORS).includes(input.color) &&
          verifySession(input.sessionId, ip, input.userId, true)
        ) {
          let date = input.date ? new Date(input.date) : undefined;
          if (date && isNaN(date.getTime())) {
            date = undefined;
          }

          const points = await addPoints(
            input.color as keyof typeof COLORS,
            input.number,
            date,
            input.owner,
            input.reason
          );
          dataChanged = true;
          return points;
        }
        return false;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('checkSession', {
    input: z.object({
      sessionId: z.string().length(20),
      userId: z.string().nonempty().length(20),
      admin: z.boolean().optional(),
    }),
    resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        return verifySession(input.sessionId, ip, input.userId, input.admin);
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('logout', {
    input: z.object({
      sessionId: z.string().length(20),
      userId: z.string().nonempty().length(20),
      all: z.boolean().optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        return deleteSessions(input.sessionId, ip, input.userId, input.all);
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .query('getCode', {
    input: z.object({
      sessionId: z.string().length(20),
      userId: z.string().nonempty().length(20),
      code: z.string().length(20),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        const session = getSetSession(input.sessionId, ip, input.userId);
        if (session) {
          const isAdmin = verifySession(
            input.sessionId,
            ip,
            input.userId,
            true
          );
          const userEmail = isAdmin
            ? undefined
            : (await getUserMail(input.userId)) || undefined;
          if (isAdmin || userEmail) {
            getCurrentCode(
              input.code,
              session.currentHouse,
              userEmail,
              isAdmin
            );
          }
        }
        return false;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('redeemCode', {
    input: z.object({
      sessionId: z.string().length(20),
      userId: z.string().nonempty().length(20),
      code: z.string().length(20),
      amount: z.number().min(-1000).max(1000),
      date: z.number().nonnegative(),
      house: z.string().nonempty().max(20).optional(),
      reason: z.string().nonempty().max(1000).optional(),
      owner: z.string().nonempty().max(100).optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (!input.house || Object.keys(COLORS).includes(input.house)) {
          const session = getSetSession(input.sessionId, ip, input.userId);
          if (session) {
            const date = new Date(input.date);
            if (!isNaN(date.getTime())) {
              const isAdmin = verifySession(
                input.sessionId,
                ip,
                input.userId,
                true
              );
              const userEmail = isAdmin
                ? undefined
                : (await getUserMail(input.userId)) || undefined;
              if (isAdmin || userEmail) {
                redeemCode(
                  input.code,
                  input.amount,
                  date,
                  input.house as keyof typeof COLORS,
                  input.owner,
                  input.reason,
                  session.currentHouse,
                  userEmail,
                  isAdmin
                );
              }
            }
          }
        }
        return false;
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  })
  .mutation('addCode', {
    input: z.object({
      sessionId: z.string().length(20),
      userId: z.string().nonempty().length(20),
      displayReason: z.string().max(1000).optional(),
      internalReason: z.string().max(1000).optional(),
      amountMin: z.number().min(-1000).max(1000).optional(),
      amountMax: z.number().min(-1000).max(1000).optional(),
      house: z.string().nonempty().max(20).optional(),
      reason: z.string().nonempty().max(1000).optional(),
      dateMin: z.number().nonnegative().optional(),
      dateMax: z.number().nonnegative().optional(),
      redeemDateStart: z.number().nonnegative().optional(),
      redeemDateEnd: z.number().nonnegative().optional(),
      allowedOwners: z
        .array(z.string().nonempty().max(100))
        .max(1000)
        .optional(),
      allowedHouses: z
        .array(z.string().nonempty().max(20))
        .max(Object.keys(COLORS).length)
        .optional(),
      maxRedeems: z.number().nonnegative().max(1000).optional(),
      redeemablePerRedeemer: z.number().nonnegative().max(1000).optional(),
      redeemablePerHouse: z.number().nonnegative().max(1000).optional(),
      onlyAdmin: z.boolean().optional(),
      onlyEligible: z.boolean().optional(),
      onlyLoggedIn: z.boolean().optional(),
      showAllowedHouses: z.boolean().optional(),
      allowSettingHouse: z.boolean().optional(),
      autoSetHouse: z.boolean().optional(),
      allowSettingReason: z.boolean().optional(),
      owner: z.string().nonempty().max(100).optional(),
      showAllowedOwners: z.boolean().optional(),
      allowSettingOwner: z.boolean().optional(),
      autoSetOwner: z.boolean().optional(),
    }),
    async resolve({ input, ctx }) {
      try {
        const ip = getIp(ctx as Context);
        if (
          (!input.house || Object.keys(COLORS).includes(input.house)) &&
          (!input.allowedHouses ||
            input.allowedHouses.every((allowedHouse) =>
              Object.keys(COLORS).includes(allowedHouse)
            )) &&
          verifySession(input.sessionId, ip, input.userId, true)
        ) {
          let dateMin = input.dateMin ? new Date(input.dateMin) : undefined;
          if (dateMin && isNaN(dateMin.getTime())) {
            dateMin = undefined;
          }
          let dateMax = input.dateMax ? new Date(input.dateMax) : undefined;
          if (
            dateMax &&
            (isNaN(dateMax.getTime()) || (dateMin && dateMax < dateMin))
          ) {
            dateMax = undefined;
          }
          let redeemDateStart = input.redeemDateStart
            ? new Date(input.redeemDateStart)
            : undefined;
          if (
            redeemDateStart &&
            (isNaN(redeemDateStart.getTime()) || new Date() > redeemDateStart)
          ) {
            redeemDateStart = undefined;
          }
          let redeemDateEnd = input.redeemDateEnd
            ? new Date(input.redeemDateEnd)
            : undefined;
          if (
            redeemDateEnd &&
            (isNaN(redeemDateEnd.getTime()) ||
              new Date() > redeemDateEnd ||
              (redeemDateStart && redeemDateEnd < redeemDateStart))
          ) {
            redeemDateEnd = undefined;
          }
          addCode(
            input.displayReason,
            input.internalReason,
            input.amountMin,
            input.amountMax,
            input.house,
            input.reason,
            dateMin,
            dateMax,
            redeemDateStart,
            redeemDateEnd,
            input.allowedOwners,
            input.allowedHouses as (keyof typeof COLORS)[] | undefined,
            input.maxRedeems,
            input.redeemablePerRedeemer,
            input.redeemablePerHouse,
            input.onlyAdmin,
            input.onlyEligible,
            input.onlyLoggedIn,
            input.showAllowedHouses,
            input.allowSettingHouse,
            input.autoSetHouse,
            input.allowSettingReason,
            input.owner,
            input.showAllowedOwners,
            input.allowSettingOwner,
            input.autoSetOwner
          );
        } else {
          return false;
        }
      } catch (e: unknown) {
        throw internalServerError(e);
      }
    },
  });

setInterval(
  () =>
    (async () => {
      try {
        if (dataChanged) {
          dataChanged = false;
          dataChangedEvent.next(await getPointsWithStats());
        }
      } catch (e: unknown) {
        console.error(e);
        process.exitCode = 1;
      }
    })(),
  REFRESH_INTERVAL
);

export type AppRouter = typeof appRouter;
