// @tower-defense/config/shapes.ts

export const TOWER_SHAPES = {
  I: [[true], [true], [true], [true]],

  O: [
    [true, true],
    [true, true],
  ],

  T: [
    [true, true, true],
    [false, true, false],
  ],

  L: [
    [true, false],
    [true, false],
    [true, true],
  ],

  J: [
    [false, true],
    [false, true],
    [true, true],
  ],

  S: [
    [false, true, true],
    [true, true, false],
  ],

  Z: [
    [true, true, false],
    [false, true, true],
  ],
} as const

export type ShapeKey = keyof typeof TOWER_SHAPES
export const SHAPE_VALUES = Object.values(TOWER_SHAPES)
