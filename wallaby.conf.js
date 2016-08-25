module.exports = function(wallaby) {
  return {
    files: [
      'index.js',
      //{pattern: 'lib/server.js', instrument: false},
      'lib/*.js',
      'test/*.js',
      '!test/test_*.js'
    ],
    tests: [
      'test/test_*.js'  
    ],
    filesWithNoCoverageCalculated: [
      'test/*.js'
    ],
    workers: {
      recycle: true
    },
    env: {
      type: 'node'
    }
  };
};
