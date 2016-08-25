/* eslint-env node, mocha */
'use strict';

//const sinon = require('sinon');
const {newCache} = require('./helper.js');
const commonTests = require('./common_tests.js');

describe('SocketMemory', function() {
  let counter = 0;
  commonTests(function(ttl, params, callback) {
    counter += 1;
    let cache_params = Object.assign({
      socket_server: {
        socket_path: `wrapper_memory_test${counter}.sock`,
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
