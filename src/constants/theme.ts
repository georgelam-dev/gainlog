/**
 * Chalk on steel: cool slate surfaces, chalk-white type, a soft blue for
 * anything you can act on, and macro colours borrowed from calibrated plates.
 */
export const colors = {
  /** brushed steel */
  bg: '#15181D',
  /** sections, sheets */
  card: '#1E232A',
  /** inputs, secondary buttons */
  cardAlt: '#282E37',
  /** chalk */
  text: '#E9EDF3',
  /** chalk dust */
  muted: '#8E97A5',
  border: '#333A45',
  /** soft blue — actions, links, progress */
  primary: '#6AA5FF',
  primaryText: '#0C1626',
  danger: '#FF6A55',
  star: '#F2C230',
  /** 15 kg plate yellow */
  carbs: '#F2C230',
  /** 25 kg plate red */
  protein: '#E0433F',
  /** 10 kg plate green */
  fat: '#3FA65A',
  /** a completed set */
  done: '#3FA65A',
  doneWash: 'rgba(63, 166, 90, 0.14)',
  /** personal record badge */
  pr: '#F2C230',
  /** water tracker */
  water: '#4FC3E8',
  /** superset / circuit bars, in group order */
  groups: ['#6AA5FF', '#F2C230', '#3FA65A', '#E0433F', '#B48CF2'],
  /** traffic-light states (food levels, calories vs goal) — not macro colours */
  good: '#3FA65A',
  caution: '#F0943A',
  track: '#2D333D',
  overlay: 'rgba(7, 9, 13, 0.66)',
};

/** Section radius. Inputs and checks are cut tighter (radii.steel); chips are pills. */
export const radius = 12;
export const radii = { steel: 4, section: radius, sheet: 18, pill: 999 };
export const spacing = 16;

/**
 * Font families registered in `useAppFonts`. `fontWeight` picks the face.
 * Body is applied by default through `@/components/ui/Text`; use display for
 * numbers and titles at 20px and up.
 */
export const fonts = {
  body: 'Nunito',
  display: 'Nunito',
};
