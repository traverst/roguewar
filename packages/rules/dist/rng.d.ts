export type PRNG = () => number;
/**
 * Simple Mulberry32 PRNG
 */
export declare function mulberry32(a: number): PRNG;
export declare function randomInt(rng: PRNG, min: number, max: number): number;
