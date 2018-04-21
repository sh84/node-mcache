/* eslint-env node, mocha */
'use strict';

const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const should = require('should');
const helper = require('./helper.js'), itAsync = helper.itAsync;

function initServerPromise(server_lib) {
  return new Promise((done) => {
    server_lib.run('test.sock', 'test.pid', done);
  });
}

function initForkServerPromise(server) {
  return new Promise((done) => {
    server.send({
      socket_path: 'test_fork.sock',
      pid_file_path: 'test_fork.pid'
    });
    server.once('message', msg => done(msg));
  });
}

describe('Server', function() {
  itAsync('require from main process', function*() {
    const server_lib = require('../lib/server.js');
    let err1 = yield initServerPromise(server_lib);
    should.not.exist(err1);
    // already running
    let err2 = yield initServerPromise(server_lib);
    err2.should.be.eql('server already running');
    server_lib.close(false);
  });
  itAsync('fork', function*() {
    let server1 = child_process.fork(path.resolve(__dirname, '../lib/server.js'), ['_run_mcache_server']);
    let msg1 = yield initForkServerPromise(server1);
    should.not.exist(msg1.error);
    // already running
    let msg2 = yield initForkServerPromise(server1);
    msg2.should.be.ok();
    // another server
    let server2 = child_process.fork(path.resolve(__dirname, '../lib/server.js'), ['_run_mcache_server']);
    let msg3 = yield initForkServerPromise(server2);
    msg3.should.be.ok();
    // wait server2 exit
    //yield new Promise(succ => server2.on('exit', succ));
    // kill server1 and wait
    server2.kill('SIGKILL');
    yield new Promise(succ => server2.on('exit', succ));
    server1.kill('SIGTERM');
    yield new Promise(succ => server1.on('exit', succ));
    // check socket and pid file
    fs.existsSync('test_fork.sock').should.be.not.ok();
    fs.existsSync('test_fork.pid').should.be.not.ok();
  });
});
