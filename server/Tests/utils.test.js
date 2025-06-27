jest.mock('../logger.js', () => ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const { shuffleArraySeeded, sfc32, cyrb128 } = require('../utils');

describe('shuffleArraySeeded', () => {
    test('produces the same output for the same seed and input', () => {
        const baseArray = Array.from({ length: 10 }, (_, i) => i); // [0, 1, 2, ..., 9]
        const seedString = '2025-06-27';
        const seed = cyrb128(seedString);

        const getShuffled = () => {
            const arrayCopy = [...baseArray]; // avoid in-place mutation
            const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
            shuffleArraySeeded(arrayCopy, rand);
            return arrayCopy;
        };

        const result1 = getShuffled();
        const result2 = getShuffled();

        expect(result1).toEqual(result2); // deterministic output
    });

    test('produces different output for different seeds', () => {
        const baseArray = Array.from({ length: 10 }, (_, i) => i);
        const seedA = cyrb128('2025-06-27');
        const seedB = cyrb128('2025-06-28');

        const getShuffled = (seed) => {
            const arrayCopy = [...baseArray];
            const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
            shuffleArraySeeded(arrayCopy, rand);
            return arrayCopy;
        };

        const resultA = getShuffled(seedA);
        const resultB = getShuffled(seedB);

        expect(resultA).not.toEqual(resultB); // different seed, different result
    });
});
