import { WithId } from 'mongodb';
import { COLORS } from './constants.js';
import { getCodesCollection } from './data.js';
import { makeId } from './id.js';
import { PointsCode, PointsCodePrivate } from './model.js';
import { addPoints } from './points.js';

const stripCodeIdAndPrivateInfo = (
  codeObject: WithId<PointsCodePrivate>
): PointsCode => {
  return {
    displayReason: codeObject.displayReason,
    amountMin: codeObject.amountMin,
    amountMax: codeObject.amountMax,
    allowedHouses: codeObject.showAllowedHouses
      ? codeObject.allowedHouses
      : undefined,
    allowSettingHouse: codeObject.allowSettingHouse,
    autoSetHouse: codeObject.autoSetHouse,
    allowSettingReason: codeObject.allowSettingReason,
    allowedOwners: codeObject.showAllowedOwners
      ? codeObject.allowedOwners
      : undefined,
    allowSettingOwner: codeObject.allowSettingOwner,
    autoSetOwner: codeObject.autoSetOwner,
    dateMin: codeObject.dateMin,
    dateMax: codeObject.dateMax,
  };
};

export const redeemCode = async (
  code: string,
  amount: number,
  date: Date,
  house?: keyof typeof COLORS,
  owner?: string,
  reason?: string,
  currentHouse?: keyof typeof COLORS,
  redeemer?: string,
  isAdmin = false
) => {
  const codesCollection = await getCodesCollection();

  const modifyResult = await codesCollection.findOneAndUpdate(
    {
      code,
      $expr: { $gt: ['$maxRedeems', '$redeems'] },
      $and: [
        {
          $or: [
            { redeemDateStart: { $type: 'undefined' } },
            { redeemDateStart: { $lte: new Date() } },
          ],
        },
        {
          $or: [
            { redeemDateEnd: { $type: 'undefined' } },
            { redeemDateStart: { $gte: new Date() } },
          ],
        },
        ...(house ? [{ allowSettingHouse: true }] : []),
        ...(!house
          ? [
              {
                $or: [
                  ...(!isAdmin && currentHouse ? [{ autoSetHouse: true }] : []),
                  {
                    $and: [
                      { house: { $exists: true } },
                      {
                        $expr: {
                          $gte: [
                            '$redeemablePerHouse',
                            '$redeemedHouses[$house]',
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ]
          : []),
        ...(owner ? [{ allowSettingOwner: true }] : []),
        ...(!owner
          ? [
              {
                $or: [
                  ...(!isAdmin && redeemer ? [{ autoSetOwner: true }] : []),
                  {
                    $and: [
                      { owner: { $exists: true } },
                      {
                        $expr: {
                          $gte: [
                            '$redeemablePerRedeemer',
                            '$redeemers[$owner]',
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ]
          : []),
        ...(!isAdmin && reason ? [{ allowSettingReason: true }] : []),
        ...(!isAdmin && !currentHouse && !redeemer
          ? [{ onlyLoggedIn: { $ne: true } }]
          : []),
        ...(!isAdmin && !currentHouse ? [{ onlyEligible: { $ne: true } }] : []),
        ...(!isAdmin ? [{ onlyAdmin: { $ne: true } }] : []),
        {
          $or: [
            { dateMin: { $type: 'undefined' } },
            { dateMin: { $lte: date } },
          ],
        },
        {
          $or: [
            { dateMax: { $type: 'undefined' } },
            { dateMax: { $gte: date } },
          ],
        },
        {
          $or: [
            { amountMin: { $type: 'undefined' } },
            { amountMin: { $lte: amount } },
          ],
        },
        {
          $or: [
            { amountMax: { $type: 'undefined' } },
            { amountMax: { $gte: amount } },
          ],
        },
        ...(!isAdmin && currentHouse
          ? [
              {
                $or: [
                  { autoSetHouse: { $ne: true } },
                  { allowedHouses: { $size: 0 } },
                  { allowedHouses: currentHouse },
                ],
              },
            ]
          : []),
        ...(!isAdmin && redeemer
          ? [
              {
                $or: [
                  { autoSetOwner: { $ne: true } },
                  { allowedOwners: { $size: 0 } },
                  { allowedOwners: redeemer },
                ],
              },
            ]
          : []),
        ...(house || !isAdmin || currentHouse
          ? [
              {
                $and: [
                  ...(currentHouse && !isAdmin ? [{ autoSetHouse: true }] : []),
                  {
                    $expr: {
                      $gte: [
                        '$redeemablePerHouse',
                        '$redeemedHouses[' + (house ?? currentHouse) + ']',
                      ],
                    },
                  },
                ],
              },
            ]
          : []),
        ...(owner || (!isAdmin && redeemer)
          ? [
              {
                $and: [
                  ...(redeemer && !isAdmin ? [{ autoSetOwner: true }] : []),
                  {
                    $expr: {
                      $gte: [
                        '$redeemablePerRedeemer',
                        '$redeemers[' + (owner ?? redeemer) + ']',
                      ],
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    {
      $inc: {
        redeems: 1,
        ...(house || !currentHouse || isAdmin
          ? { ['redeemedHouses[' + (house ?? '$house') + ']']: 1 }
          : {}),
        ...(owner || !redeemer || isAdmin
          ? { ['redeemers[' + redeemer + ']']: 1 }
          : {}),
      },
      $cond: [
        ...(!house && currentHouse && !isAdmin
          ? [
              {
                if: {
                  autoSetHouse: true,
                },
                then: {
                  $inc: { ['redeemedHouses[' + currentHouse + ']']: 1 },
                },
              },
            ]
          : []),
        ...(!owner && redeemer && !isAdmin
          ? [
              {
                if: {
                  autoSetOwner: true,
                },
                then: {
                  $inc: { ['redeemers[' + redeemer + ']']: 1 },
                },
              },
            ]
          : []),
      ],
    }
  );
  if (modifyResult.ok && modifyResult.value) {
    const item = modifyResult.value;
    await addPoints(
      house && item.allowSettingHouse && !isAdmin
        ? house
        : currentHouse && !isAdmin && item.autoSetHouse
        ? currentHouse
        : (item.house as keyof typeof COLORS),
      amount,
      date,
      owner && item.allowSettingOwner && !isAdmin
        ? owner
        : redeemer && !isAdmin && item.autoSetOwner
        ? redeemer
        : (item.owner as string),
      reason && item.allowSettingReason && !isAdmin ? reason : item.reason,
      redeemer,
      true,
      isAdmin
    );
    return true;
  }
  return false;
};

export const getCurrentCode = async (
  code: string,
  currentHouse?: keyof typeof COLORS,
  redeemer?: string,
  isAdmin = false
) => {
  const codesCollection = await getCodesCollection();

  const codeObject = await codesCollection.findOne({
    code,
    $expr: { $gt: ['$maxRedeems', '$redeems'] },
    $and: [
      {
        $or: [
          { redeemDateStart: { $type: 'undefined' } },
          { redeemDateStart: { $lte: new Date() } },
        ],
      },
      {
        $or: [
          { redeemDateEnd: { $type: 'undefined' } },
          { redeemDateStart: { $gte: new Date() } },
        ],
      },
      ...(!isAdmin && !currentHouse && !redeemer
        ? [{ onlyLoggedIn: { $ne: true } }]
        : []),
      ...(!isAdmin && !currentHouse ? [{ onlyEligible: { $ne: true } }] : []),
      ...(!isAdmin
        ? [
            { onlyAdmin: { $ne: true } },
            {
              $or: [
                ...(currentHouse ? [{ autoSetHouse: true }] : []),
                { allowSettingHouse: true },
                { house: { $exists: true } },
              ],
            },
            {
              $or: [
                ...(redeemer ? [{ autoSetOwner: true }] : []),
                { allowSettingOwner: true },
                { owner: { $exists: true } },
              ],
            },
          ]
        : []),
      {
        $or: [
          { amountMin: { $type: 'undefined' } },
          { amountMax: { $type: 'undefined' } },
          { $expr: { $gte: ['$amountMax', '$amountMin'] } },
        ],
      },
      {
        $or: [
          { dateMin: { $type: 'undefined' } },
          { dateMax: { $type: 'undefined' } },
          { $expr: { $gte: ['$dateMax', '$dateMin'] } },
        ],
      },
      ...(!isAdmin && currentHouse
        ? [
            {
              $or: [
                { autoSetHouse: { $ne: true } },
                { allowedHouses: { $size: 0 } },
                { allowedHouses: currentHouse },
              ],
            },
          ]
        : []),
      ...(!isAdmin && redeemer
        ? [
            {
              $or: [
                { autoSetOwner: { $ne: true } },
                { allowedOwners: { $size: 0 } },
                { allowedOwners: redeemer },
              ],
            },
          ]
        : []),
      ...(!isAdmin && currentHouse
        ? [
            {
              $or: [
                { allowSettingHouse: true },
                {
                  $and: [
                    { autoSetHouse: true },
                    {
                      $expr: {
                        $gte: [
                          '$redeemablePerHouse',
                          '$redeemedHouses[' + currentHouse + ']',
                        ],
                      },
                    },
                  ],
                },
                {
                  $and: [
                    { house: { $exists: true } },
                    {
                      $expr: {
                        $gte: [
                          '$redeemablePerHouse',
                          '$redeemedHouses[$house]',
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ]
        : []),
      ...(!isAdmin && redeemer
        ? [
            {
              $or: [
                { allowSettingOwner: true },
                {
                  $and: [
                    { autoSetOwner: true },
                    {
                      $expr: {
                        $gte: [
                          '$redeemablePerRedeemer',
                          '$redeemers[' + redeemer + ']',
                        ],
                      },
                    },
                  ],
                },
                {
                  $and: [
                    { owner: { $exists: true } },
                    {
                      $expr: {
                        $gte: ['$redeemablePerRedeemer', '$redeemers[$owner]'],
                      },
                    },
                  ],
                },
              ],
            },
          ]
        : []),
    ],
  });
  if (codeObject) {
    return stripCodeIdAndPrivateInfo(codeObject);
  }
  return null;
};

export const addCode = async (
  displayReason?: string,
  internalReason?: string,
  amountMin?: number,
  amountMax?: number,
  house?: string,
  reason?: string,
  dateMin?: Date,
  dateMax?: Date,
  redeemDateStart?: Date,
  redeemDateEnd?: Date,
  allowedOwners = [] as string[],
  allowedHouses = [] as (keyof typeof COLORS)[],
  maxRedeems = 1,
  redeemablePerRedeemer = 1,
  redeemablePerHouse = 1,
  onlyAdmin = false,
  onlyEligible = true,
  onlyLoggedIn = true,
  showAllowedHouses = true,
  allowSettingHouse = false,
  autoSetHouse = true,
  allowSettingReason = false,
  owner = '',
  showAllowedOwners = false,
  allowSettingOwner = false,
  autoSetOwner = true
) => {
  const codesCollection = await getCodesCollection();

  const code = makeId(20);

  const deleteResult = await codesCollection.deleteMany({
    redeemDateEnd: { lt: new Date() },
    $expr: { $lte: ['$maxRedeems', '$redeems'] },
  });

  if (deleteResult.acknowledged) {
    const result = await codesCollection.insertOne({
      code,
      amountMin,
      amountMax,
      house,
      reason,
      showAllowedHouses,
      allowSettingHouse,
      autoSetHouse,
      allowedOwners,
      allowedHouses,
      displayReason,
      internalReason,
      maxRedeems,
      redeems: 0,
      allowSettingReason,
      owner,
      showAllowedOwners,
      allowSettingOwner,
      autoSetOwner,
      dateMin,
      dateMax,
      redeemDateStart,
      redeemDateEnd,
      redeemers: {},
      redeemablePerRedeemer,
      redeemedHouses: Object.keys(COLORS).reduce(
        (o, color) => ({ ...o, [color]: 0 }),
        {} as { [key in keyof typeof COLORS]: number }
      ),
      redeemablePerHouse,
      onlyAdmin,
      onlyEligible,
      onlyLoggedIn,
    });
    if (result.acknowledged) {
      return code;
    }
  }
  return '';
};
