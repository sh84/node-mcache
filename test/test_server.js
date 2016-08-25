/* eslint-env node, mocha */
'use strict';

const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const should = require('should');
const helper = require('./helper.js'), itAsync = helper.itAsync;

function initServerPromise(server) {
  return new Promise((done) => {
    server.send({
      socket_path: 'test.sock',
      params: {
        type: 'memory'
      }
    });
    server.once('message', msg => done(msg));
  });
}

describe('Sockets', function() {
  it('require from main process', function() {
    (() => require('../lib/server.js')).should.throw();
  });
  itAsync('fork', function*() {
    let server1 = child_process.fork(path.resolve(__dirname, '../lib/server.js'));
    let msg1 = yield initServerPromise(server1);
    should.not.exist(msg1.error);
    // already running
    let msg2 = yield initServerPromise(server1);
    msg2.should.be.ok();
    // another server
    let server2 = child_process.fork(path.resolve(__dirname, '../lib/server.js'));
    let msg3 = yield initServerPromise(server2);
    msg3.should.be.ok();
    // wait server2 exit
    //yield new Promise(succ => server2.on('exit', succ));
    // kill server1 and wait
    server1.kill('SIGKILL');
    yield new Promise(succ => server1.on('exit', succ));
    server2.kill('SIGTERM');
    yield new Promise(succ => server2.on('exit', succ));
    // check socket file
    fs.existsSync('test.sock').should.be.not.ok();
  });
});
