const GameManager = require('../GameManager');
const gm = new GameManager(); // Typically done by _server.js
const Room = require('../room');
const GamePlay = require('../GamePlay');
const ACTION = require('../enums').ACTION;

// Mock the logger to suppress output during tests
jest.mock('../logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn()
}));

describe('GamePlay.start', () => {
  let room;
  let gameplay;

  beforeEach(() => {
    room = new Room('test-room-id');
    gameplay = room.gameplay;

    // Spy on the room's notify and update methods
    jest.spyOn(room, 'notifyStartGame').mockImplementation(() => {});
    jest.spyOn(room, 'updateImportantInfo').mockImplementation(() => {});
  });

  test('should start the game properly', () => {
    const result = gameplay.start();

    expect(gameplay.board.gameNumber).toBe(1);
    expect(gameplay.action).toBe(ACTION.SHUFFLE);
    expect(room.notifyStartGame).toHaveBeenCalled();
    expect(room.updateImportantInfo).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
