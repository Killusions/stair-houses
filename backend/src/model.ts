import { COLORS } from './constants.js';

export interface Points {
  color: keyof typeof COLORS;
  points: number;
  lastChanged: Date;
}

export interface PointsCategory {
  name: string;
  amount: number;
}

export interface PointsCategoryWithDate extends PointsCategory {
  name: string;
  amount: number;
  date: Date;
}

export interface PointsWithStats extends Points {
  categories: PointsCategory[];
  datedCategories: PointsCategoryWithDate[];
}

export interface PointEvent {
  color: string;
  pointsDiff: number;
  date: Date;
  addedDate: Date;
  addedBy?: string;
  owner?: string;
  reason?: string;
  claimedFromCode?: boolean;
  claimedBy?: string;
  claimedByAdmin?: boolean;
}

export interface BaseSetting {
  key: string;
  value: unknown;
  type: string;
}

export interface StringSetting extends BaseSetting {
  key: string;
  value: string;
  type: 'string';
}

export interface BooleanSetting extends BaseSetting {
  key: string;
  value: boolean;
  type: 'boolean';
}

export interface NumberSetting extends BaseSetting {
  key: string;
  value: number;
  type: 'string';
}

export interface DateSetting extends BaseSetting {
  key: string;
  value: Date;
  type: 'date';
}

export interface SubSetting extends BaseSetting {
  key: string;
  value: Setting[];
  type: 'sub';
}

export interface UserInfo {
  name?: string;
}

export interface UserInfoPrivate extends UserInfo {
  infosSet: boolean;
}

export interface UserInfoCombined extends UserInfoPrivate {
  currentHouse?: keyof typeof COLORS;
}

export interface User extends UserInfoPrivate {
  customId: string;
  email: string;
  registerDate: Date;
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

export type Setting =
  | StringSetting
  | BooleanSetting
  | NumberSetting
  | DateSetting
  | SubSetting;

export interface StudentInfo {
  email: string;
  description: string;
  color: keyof typeof COLORS;
  date: Date;
}

export interface PointsCode {
  displayReason?: string;
  amountMin?: number;
  amountMax?: number;
  allowedHouses?: (keyof typeof COLORS)[];
  allowSettingHouse?: boolean;
  autoSetHouse?: boolean;
  allowSettingReason?: boolean;
  allowedOwners?: string[];
  allowSettingOwner?: boolean;
  autoSetOwner?: boolean;
  dateMin?: Date;
  dateMax?: Date;
}

export interface PointsCodePrivate extends PointsCode {
  code: string;
  internalReason?: string;
  allowedOwners: string[];
  showAllowedOwners?: boolean;
  allowedHouses: (keyof typeof COLORS)[];
  showAllowedHouses?: boolean;
  house?: string;
  maxRedeems?: number;
  redeems: number;
  reason?: string;
  owner?: string;
  redeemDateStart?: Date;
  redeemDateEnd?: Date;
  redeemers: { [key: string]: number };
  redeemablePerRedeemer: number;
  redeemedHouses: { [key in keyof typeof COLORS]: number };
  redeemablePerHouse: number;
  onlyAdmin?: boolean;
  onlyEligible?: boolean;
  onlyLoggedIn?: boolean;
}
