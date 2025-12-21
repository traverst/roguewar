export type PRNG = () => number;

/**
 * Simple Mulberry32 PRNG
 */
export function mulberry32(a: number): PRNG {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function randomInt(rng: PRNG, min: number, max: number) {
    return Math.floor(rng() * (max - min)) + min;
}
