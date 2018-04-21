/* eslint-env node, mocha */
'use strict';

const {newCache} = require('./helper.js');
const commonTests = require('./common_tests.js');
const child_process = require('child_process');

describe('SocketMemory', function() {
  let counter = 0;
  commonTests(function(ttl, params, callback) {
    counter += 1;
    let cache_params = Object.assign({
      socket_server: {
        socket_path: `wrapper_memory_test${counter}.sock`,
        pid_file_path: `wrapper_memory_test${counter}.pid`,
        callback: function(err, cache) {
          if (err) throw Error(err);
          callback(cache);
        }
      },
      type: 'memory'
    }, params);
    newCache(ttl, cache_params);
  });
});

describe('fork', function() {
  it('4 children', function(done) {
    let workers = 4;
    let err;
    for (let i = 0; i < workers; i++) {
      let p = child_process.fork('test/_fork');
      p.on('message', (m) => {
        workers -= 1;
        if (m.err) err = m.err;
        if (workers == 0) done(err);
      });
    }
  });
});
