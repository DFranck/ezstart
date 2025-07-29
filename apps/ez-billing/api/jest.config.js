module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  roots: ['<rootDir>'],

  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
