import type { PointsCategory } from '../../backend/src/model';

export interface DisplayColor {
  color: string;
  colorString: string;
  currentColor: string;
  previousColor: string;
  points: number;
  relativePercentage: number;
  currentPercentage: number;
  badgeString: string;
  badgeClass?: string;
  categories: PointsCategory[];
  zeroData?: boolean;
}

export type DisplayData = DisplayColor[];
