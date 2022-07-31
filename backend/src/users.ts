import { hash, verify } from 'argon2';
import { generateFrontendLink } from './index.js';
import type { StringSetting, UserInfoCombined, StudentInfo } from './model';
import {
  getSettingsCollection,
  getStudentsCollection,
  getUsersCollection,
} from './data.js';
import { makeId } from './id.js';
import { base64Encode } from './base64.js';
import { mailAddress, sendMail } from './mailer.js';
import { timeOutCaptchaAndResponse } from './spamPrevention.js';
import 'dotenv/config';
import crypto from 'crypto';
import {
  APP_NAME,
  COLORS,
  EMAIL_ENDING,
  EMAIL_REGEX,
  ORG_NAME,
} from './constants.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse';
import 'dotenv/config';
import { ReplaySubject } from 'rxjs';

let studentsListWait: ReplaySubject<boolean | StudentInfo[]> | undefined =
  undefined;
let studentsListError = false;
let studentsListDate: Date | null = null;

const getStudentByMail = async (email: string) => {
  const studentsCollection = await getStudentsCollection();
  return await studentsCollection.findOne({ email });
};

const getStudentsListIfNotGiven = async (list: StudentInfo[] | true) => {
  if (list !== true) {
    return list;
  }
  const studentsCollection = await getStudentsCollection();
  return (await studentsCollection.find({})).toArray();
};

const getStudentOrList = (email?: string) =>
  new Promise<StudentInfo | StudentInfo[] | null>((resolve, reject) => {
    (async () => {
      try {
        if (studentsListError) {
          resolve(null);
          return;
        }
        if (
          studentsListWait &&
          studentsListDate &&
          studentsListDate.getTime() > Date.now() - 1000 * 60 * 60
        ) {
          studentsListWait.subscribe((item) => {
            if (item) {
              (async () => {
                try {
                  if (email) {
                    resolve(await getStudentByMail(email));
                  } else {
                    resolve(await getStudentsListIfNotGiven(item));
                  }
                } catch (err) {
                  reject(err);
                }
              })();
            } else {
              resolve(null);
            }
          });
        } else {
          studentsListWait = new ReplaySubject();

          const settingsCollection = await getSettingsCollection();

          const studentsListHashObject = (await settingsCollection.findOne({
            key: 'studentsListHash',
            type: 'string',
          })) as StringSetting | undefined;

          let studentsListHash: string | undefined;

          if (studentsListHashObject) {
            studentsListHash = studentsListHashObject.value;
          }

          if (process.env.STAIR_HOUSES_CSV_PATH) {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);

            try {
              const studentsListFile = await readFile(
                __dirname + '/../' + process.env.STAIR_HOUSES_CSV_PATH,
                'utf-8'
              );
              if (studentsListFile) {
                parse(
                  studentsListFile,
                  (err, rows: [string, string, string][]) => {
                    if (err) {
                      throw err;
                    }
                    const newStudentsList = rows.map((item) => ({
                      email: item[0],
                      description: item[1],
                      color: Object.values(COLORS).includes(item[2])
                        ? Object.keys(COLORS).includes(
                            item[2].toLocaleLowerCase()
                          )
                          ? (item[2].toLocaleLowerCase() as keyof typeof COLORS)
                          : undefined
                        : undefined,
                      date: new Date(),
                    })) as StudentInfo[];
                    if (!studentsListWait) {
                      studentsListWait = new ReplaySubject();
                    }
                    const hashSum = crypto.createHash('sha256');
                    hashSum.update(studentsListFile);
                    const base64Hash = hashSum.digest('base64');
                    (async () => {
                      try {
                        if (
                          !studentsListHash ||
                          base64Hash !== studentsListHash
                        ) {
                          let removedOld = true;
                          if (studentsListHash) {
                            const removeOldHashResult =
                              await settingsCollection.deleteOne({
                                key: 'studentsListHash',
                                type: 'string',
                              });
                            if (removeOldHashResult.deletedCount !== 0) {
                              removedOld = false;
                            } else {
                              const studentsCollection =
                                await getStudentsCollection();
                              const removeOldStudentsResult =
                                await studentsCollection.deleteMany({});
                              if (removeOldStudentsResult.deletedCount !== 0) {
                                removedOld = false;
                              }
                            }
                          }
                          if (removedOld) {
                            const studentsCollection =
                              await getStudentsCollection();
                            const insertNewStudentsResult =
                              await studentsCollection.insertMany(
                                newStudentsList
                              );
                            if (insertNewStudentsResult.acknowledged) {
                              const insertNewHashResult =
                                await settingsCollection.insertOne({
                                  key: 'studentsListHash',
                                  value: base64Hash,
                                  type: 'string',
                                });
                              if (insertNewHashResult.acknowledged) {
                                studentsListWait.next(newStudentsList);
                                studentsListDate = new Date();
                                if (email) {
                                  resolve(await getStudentByMail(email));
                                } else {
                                  resolve(
                                    await getStudentsListIfNotGiven(
                                      newStudentsList
                                    )
                                  );
                                }
                                return;
                              }
                            }
                          }
                        } else if (studentsListHash) {
                          studentsListWait.next(true);
                          studentsListDate = new Date();
                          if (email) {
                            resolve(await getStudentByMail(email));
                          } else {
                            resolve(await getStudentsListIfNotGiven(true));
                          }
                          return;
                        }
                        console.log('Could not store students list');
                        studentsListWait.next(false);
                        studentsListError = true;
                        resolve(null);
                      } catch (err) {
                        studentsListWait.next(false);
                        studentsListError = true;
                        reject(err);
                      }
                    })();
                  }
                );
              } else {
                console.log('Could not read students list');
                studentsListWait.next(false);
                studentsListError = true;
                resolve(null);
              }
            } catch (err) {
              if (studentsListHash) {
                studentsListWait.next(true);
                resolve(await getStudentsListIfNotGiven(true));
              } else {
                console.log('Students list file not found');
                studentsListWait.next(false);
                studentsListError = true;
                resolve(null);
              }
            }
          } else {
            if (studentsListHash) {
              studentsListWait.next(true);
              resolve(await getStudentsListIfNotGiven(true));
            } else {
              console.log('No students list found');
              studentsListWait.next(false);
              studentsListError = true;
              resolve(null);
            }
          }
        }
      } catch (err) {
        studentsListError = true;
        reject(err);
      }
    })();
  });

const getStudentColor = async (email: string) => {
  const student = (await getStudentOrList(email)) as StudentInfo;
  if (student) {
    return student.color;
  }
  return '';
};

export const checkEmail = (email?: string): boolean =>
  !!email &&
  email.endsWith(EMAIL_ENDING) &&
  !!email.match(EMAIL_REGEX) &&
  email.toLowerCase() !== mailAddress?.toLowerCase();

export const hashPassword = async (password: string) => {
  return await hash(password);
};

const listStrings = (items: string[]): string => {
  if (items.length) {
    if (items.length === 1) {
      return items[0];
    } else if (items.length === 2) {
      return items[0] + ' and ' + items[1];
    } else {
      return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    }
  }
  return '';
};

const listChanges = (changes: { [key: string]: unknown }): [string, number] => {
  const filteredChanges = Object.keys(changes).filter((key) => changes[key]);
  return [listStrings(filteredChanges), filteredChanges.length];
};

export const verifyPassword = async (hash: string, password: string) => {
  try {
    return await verify(hash, password);
  } catch (err) {
    console.error('Failed verifying password hash');
    console.error(err);
    process.exitCode = 1;
    return false;
  }
};

export const changeUserInfo = async (
  userId: string,
  password: string,
  newPassword?: string,
  name?: string
) => {
  if (!newPassword && !name) {
    return false;
  }

  const usersCollection = await getUsersCollection();

  const registeredUser = await usersCollection.findOne({
    customId: userId,
    infosSet: true,
  });
  if (!registeredUser || !registeredUser.hash) {
    return false;
  }

  if (await verifyPassword(registeredUser.hash, password)) {
    const passwordHashed = newPassword ? await hashPassword(newPassword) : '';

    await usersCollection.updateOne(
      {
        customId: userId,
      },
      {
        $set: {
          ...(passwordHashed ? { hash: passwordHashed } : {}),
          ...(name ? { name } : {}),
        },
        $currentDate: { changedDate: true },
      }
    );

    const [changesString, changesNumber] = listChanges({
      password: passwordHashed,
      name,
    });

    const body = `Hello ${registeredUser.name}

Thank your for using ${ORG_NAME} ${APP_NAME}.

Your ${changesString} ${changesNumber > 0 ? 'have' : 'has'} been changed.

If this was not you use the site to reset it: ${generateFrontendLink(
      '/login'
    )}`;
    await sendMail(
      registeredUser.email,
      ORG_NAME + ' ' + APP_NAME + ' account changed',
      body
    );

    return true;
  }

  return false;
};

export const setUserInfoInternal = async (
  userId: string,
  code: string,
  newPassword: string,
  name: string
) => {
  if (!newPassword || !name) {
    return { success: false };
  }

  const usersCollection = await getUsersCollection();

  const registeredUser = await usersCollection.findOne({
    customId: userId,
    infosSet: false,
  });
  if (
    !registeredUser ||
    !registeredUser.resetHash ||
    !registeredUser.resetExpiration
  ) {
    return { success: false };
  }

  if (registeredUser.resetExpiration.getTime() < Date.now()) {
    await usersCollection.updateOne(
      {
        customId: userId,
      },
      {
        $unset: { resetHash: true, resetExpiration: true },
      }
    );
    return { success: false };
  }

  if (code && (await verifyPassword(registeredUser.resetHash, code))) {
    const passwordHashed = newPassword ? await hashPassword(newPassword) : '';

    if (
      (
        await usersCollection.updateOne(
          {
            customId: userId,
          },
          {
            $set: {
              hash: passwordHashed,
              name,
              infosSet: true,
            },
            $unset: { resetHash: true, resetExpiration: true },
            $currentDate: { changedDate: true },
          }
        )
      ).modifiedCount > 0
    ) {
      return {
        success: true,
        passwordHashed,
        previousName: registeredUser.name,
        email: registeredUser.email,
      };
    }
  }
  return { success: false };
};

export const setUserInfo = async (
  userId: string,
  code: string,
  newPassword: string,
  name: string
) => {
  if (!newPassword || !name) {
    return false;
  }

  const result = await setUserInfoInternal(userId, code, newPassword, name);
  if (result.success && result.email) {
    const [changesString, changesNumber] = listChanges({
      password: result.passwordHashed,
      name,
    });

    const body = `Hello ${result.email}

  Thank your for using ${ORG_NAME} ${APP_NAME}.

  Your ${changesString} ${changesNumber > 0 ? 'have' : 'has'} been set.

  If this was not you contact our support via our site: ${generateFrontendLink(
    '/login'
  )}`;
    await sendMail(
      result.email,
      ORG_NAME + ' ' + APP_NAME + ' account set',
      body
    );

    return true;
  }
  return false;
};

export const resetUserInfo = async (
  userId: string,
  code: string,
  newPassword?: string,
  name?: string
) => {
  if (!newPassword && !name) {
    return false;
  }

  const usersCollection = await getUsersCollection();

  const registeredUser = await usersCollection.findOne({
    customId: userId,
    infosSet: true,
  });
  if (
    !registeredUser ||
    !registeredUser.resetHash ||
    !registeredUser.resetExpiration
  ) {
    return false;
  }

  if (registeredUser.resetExpiration.getTime() < Date.now()) {
    await usersCollection.updateOne(
      {
        customId: userId,
      },
      {
        $unset: { resetHash: true, resetExpiration: true },
      }
    );
    return false;
  }

  if (code && (await verifyPassword(registeredUser.resetHash, code))) {
    const passwordHashed = newPassword ? await hashPassword(newPassword) : '';

    await usersCollection.updateOne(
      {
        customId: userId,
      },
      {
        $set: {
          ...(passwordHashed ? { hash: passwordHashed } : {}),
          ...(name ? { name } : {}),
        },
        $unset: { resetHash: true, resetExpiration: true },
        $currentDate: { changedDate: true },
      }
    );

    const [changesString, changesNumber] = listChanges({
      password: passwordHashed,
      name,
    });

    const body = `Hello ${registeredUser.name}

Thank your for using ${ORG_NAME} ${APP_NAME}.

Your ${changesString} ${changesNumber > 0 ? 'have' : 'has'} been changed.

If this was not you use the site to reset it: ${generateFrontendLink(
      '/login'
    )}`;
    await sendMail(
      registeredUser.email,
      ORG_NAME + ' ' + APP_NAME + ' account changed',
      body
    );

    return true;
  } else {
    return false;
  }
};

export const verifyUserEmail = async (
  userId: string,
  code: string
): Promise<{
  success: boolean;
  stay?: boolean;
  admin?: boolean;
  resetCode?: string;
  infosSet?: boolean;
  currentHouse?: keyof typeof COLORS;
}> => {
  const usersCollection = await getUsersCollection();

  const registeredUser = await usersCollection.findOne({ customId: userId });
  if (
    !registeredUser ||
    !registeredUser.verifyHash ||
    !registeredUser.verifyExpiration
  ) {
    return { success: false };
  }

  if (registeredUser.verifyExpiration.getTime() < Date.now()) {
    await usersCollection.deleteOne({
      customId: userId,
    });
    return { success: false };
  }

  if (code && (await verifyPassword(registeredUser.verifyHash, code))) {
    const passwordNew = makeId(15);
    const passwordHashed = await hashPassword(passwordNew);
    const confirmedColor = await getStudentColor(registeredUser.email);
    await usersCollection.updateOne(
      {
        customId: userId,
      },
      {
        $set: {
          resetHash: passwordHashed,
          resetExpiration: new Date(Date.now() + 1000 * 60 * 30),
        },
        $unset: { verifyHash: true, verifyExpiration: true, verifyStay: true },
        $currentDate: {
          lastLogin: true,
          ...(registeredUser.verifyDate ? {} : { verifyDate: true }),
        },
      }
    );
    return {
      success: true,
      stay: !!registeredUser.verifyStay,
      admin: false,
      resetCode: passwordNew,
      infosSet: registeredUser.infosSet,
      currentHouse: confirmedColor || undefined,
    };
  } else {
    return { success: false };
  }
};

export const createLoginLink = async (userId: string, stay = false) => {
  const usersCollection = await getUsersCollection();

  const registeredUser = await usersCollection.findOne({ customId: userId });
  if (!registeredUser) {
    return false;
  }

  const passwordNew = makeId(15);
  const passwordHashed = await hashPassword(passwordNew);

  const link = generateFrontendLink(
    `/link?id=${userId}&code=${base64Encode(passwordNew)}`
  );

  await usersCollection.updateOne(
    {
      customId: userId,
    },
    {
      $set: {
        verifyHash: passwordHashed,
        verifyExpiration: new Date(Date.now() + 1000 * 60 * 30),
        verifyStay: stay,
      },
      $currentDate: { lastChanged: true },
    }
  );

  return link;
};

export const registerOrEmailLoginInternal = async (
  email: string,
  stay = false,
  isRegister = true
) => {
  const lowercaseEmail = email.toLocaleLowerCase();

  const usersCollection = await getUsersCollection();

  const registeredUser = await usersCollection.findOne({
    email: lowercaseEmail,
  });
  if (isRegister) {
    if (registeredUser) {
      if (
        registeredUser.verifyDate ||
        !registeredUser.verifyExpiration ||
        registeredUser.verifyExpiration.getTime() < Date.now()
      ) {
        return { success: false };
      } else {
        await usersCollection.deleteOne({
          email: lowercaseEmail,
        });
        return { success: false };
      }
    }
  } else {
    if (!registeredUser || !registeredUser.verifyDate) {
      return { success: false };
    }
  }

  let userId = registeredUser?.customId;

  const passwordNew = makeId(15);
  const passwordHashed = await hashPassword(passwordNew);
  if (isRegister) {
    userId = makeId(20);
    await usersCollection.insertOne({
      customId: userId,
      email: lowercaseEmail,
      verifyHash: passwordHashed,
      verifyExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24),
      verifyStay: stay,
      registerDate: new Date(),
      infosSet: false,
    });
    await usersCollection.deleteMany({
      email: lowercaseEmail,
      verifyExpiration: { $lte: new Date() },
      verifyHash: { $exists: true },
      verifyDate: { $exists: false },
    });
  } else {
    await usersCollection.updateOne(
      {
        email: lowercaseEmail,
      },
      {
        $set: {
          verifyHash: passwordHashed,
          verifyExpiration: new Date(Date.now() + 1000 * 60 * 60),
          verifyStay: stay,
        },
        $currentDate: { lastChanged: true },
      }
    );
  }
  return {
    success: userId ? true : false,
    userId: userId ? userId : undefined,
    passwordNew: passwordNew ? passwordNew : undefined,
  };
};

export const registerOrEmailLogin = async (
  email: string,
  ip: string,
  captchaToken?: string,
  stay = false,
  isRegister = true
) => {
  if (!checkEmail(email)) {
    return await timeOutCaptchaAndResponse(ip, captchaToken, undefined, false);
  }

  return await timeOutCaptchaAndResponse(ip, captchaToken, async () => {
    const result = await registerOrEmailLoginInternal(email, stay, isRegister);

    if (result.success && result.userId && result.passwordNew) {
      const body = isRegister
        ? `Welcome to ${ORG_NAME} ${APP_NAME}.

To confirm your account just press the following link within the next 24 hours: ${generateFrontendLink(
            '/login?register=true&id=' +
              result.userId +
              '&code=' +
              base64Encode(result.passwordNew)
          )}

If you did not request this email, simply ignore it.`
        : `Welcome back to ${ORG_NAME} ${APP_NAME}.

To log in just press the following link within the next hour: ${generateFrontendLink(
            '/login?id=' +
              result.userId +
              '&code=' +
              base64Encode(result.passwordNew)
          )}

If you did not request this email, simply ignore it.`;

      await sendMail(
        email,
        ORG_NAME +
          ' ' +
          APP_NAME +
          ' ' +
          (isRegister ? 'Verification' : 'Login'),
        body
      );
      return { success: true };
    }

    return { success: false };
  });
};

export const verifyAdminPassword = async (
  password: string,
  ip: string,
  captchaToken?: string
) => {
  return await timeOutCaptchaAndResponse(ip, captchaToken, async () => {
    const settingsCollection = await getSettingsCollection();

    const hashedPasswordObject = (await settingsCollection.findOne({
      key: 'password',
      type: 'string',
    })) as StringSetting | undefined;
    const adminIdObject = (await settingsCollection.findOne({
      key: 'adminId',
      type: 'string',
    })) as StringSetting | undefined;
    if (hashedPasswordObject && adminIdObject) {
      const result = await verifyPassword(hashedPasswordObject.value, password);
      if (result) {
        return { success: true, admin: true, userId: adminIdObject.value };
      }
    }
    return { success: false };
  });
};

export const loginUser = async (
  email: string,
  password: string,
  ip: string,
  captchaToken?: string
) => {
  if (!checkEmail(email)) {
    return await timeOutCaptchaAndResponse(ip, captchaToken, undefined, false);
  }

  const lowercaseEmail = email.toLocaleLowerCase();

  return await timeOutCaptchaAndResponse(ip, captchaToken, async () => {
    const usersCollection = await getUsersCollection();

    const user = await usersCollection.findOne({
      email: lowercaseEmail,
    });
    if (user && user.hash) {
      const result = await verifyPassword(user.hash, password);
      const confirmedColor = await getStudentColor(email);
      if (result) {
        if (
          (
            await usersCollection.updateOne(
              { customId: user.customId },
              {
                $currentDate: {
                  lastLogin: true,
                },
              }
            )
          ).modifiedCount > 0
        ) {
          return {
            success: true,
            userId: user.customId,
            infosSet: user.infosSet,
            currentHouse: confirmedColor || undefined,
          };
        }
      }
    }
    return { success: false };
  });
};

export const getUserName = async (userId: string): Promise<string> => {
  const usersCollection = await getUsersCollection();

  const user = await usersCollection.findOne({
    customId: userId,
  });

  if (!user) {
    const settingsCollection = await getSettingsCollection();

    const adminIdObject = (await settingsCollection.findOne({
      key: 'adminId',
      type: 'string',
      value: userId,
    })) as StringSetting | undefined;

    if (adminIdObject) {
      return 'Admin';
    }
  }

  if (user) {
    return user.name ?? user.email;
  }
  return '';
};

export const getUserInfo = async (
  userId: string
): Promise<UserInfoCombined | null> => {
  const usersCollection = await getUsersCollection();

  const user = await usersCollection.findOne({
    customId: userId,
  });

  if (!user) {
    const settingsCollection = await getSettingsCollection();

    const adminIdObject = (await settingsCollection.findOne({
      key: 'adminId',
      type: 'string',
      value: userId,
    })) as StringSetting | undefined;

    if (adminIdObject) {
      return {
        name: 'Admin',
        infosSet: false,
      };
    }
  }

  if (user) {
    const confirmedColor = await getStudentColor(user.email);
    return {
      name: user.name ?? user.email,
      infosSet: user.infosSet,
      currentHouse: confirmedColor || undefined,
    };
  }
  return null;
};

export const sendUserMail = async (
  userId: string,
  subject: string,
  body: string,
  html?: string
) => {
  const usersCollection = await getUsersCollection();

  const user = await usersCollection.findOne({
    customId: userId,
  });

  if (user) {
    await sendMail(user.email, subject, body, html);
  }

  return false;
};
