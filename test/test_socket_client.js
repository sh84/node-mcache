/* eslint-env node, mocha */
'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const {itAsync} = require('./helper.js');

const SocketClient = require('../lib/socket_client.js');

function getSocketClientParams() {
  getSocketClientParams.count = getSocketClientParams.count ? getSocketClientParams.count + 1 : 1;
  return {
    socket_path: `client_test${getSocketClientParams.count}.sock`,
    pid_file_path: `client_test${getSocketClientParams.count}.pid`
  };
}

describe('Sockets client', function() {
  it('get same instance for two requests', function(done) {
    let params = getSocketClientParams();
    SocketClient.get(params, (err1, client1) => {
      should.not.exist(err1);
      SocketClient.get(params, (err2, client2) => {
        should.not.exist(err2);
        client2.should.be.eql(client1);
        done();
      });
    });
  });
  it('create server for first client and not for second', function(done) {
    let params = getSocketClientParams();
    let client1 = new SocketClient(params);
    let run_server1_fn = sinon.spy(client1, 'runForkServer');
    client1.runClient(function(err) {
      should.not.exist(err);
      run_server1_fn.should.be.calledOnce();
      client1.client.should.be.ok();
      client1.server.should.be.ok();
      let client2 = new SocketClient(params);
      let run_server2_fn = sinon.spy(client2, 'runForkServer');
      client2.runClient(function(err2) {
        should.not.exist(err2);
        run_server2_fn.should.not.be.called();
        client2.client.should.be.ok();
        should.not.exist(client2.server);
        done();
      });
    });
  });
  it('reconnect && recreate on server kill', function(done) {
    SocketClient.get(getSocketClientParams(), (err1, client) => {
      should.not.exist(err1);
      client.client.should.be.ok();
      client.server.should.be.ok();
      let run_server_fn = sinon.spy(client, 'runForkServer');
      client.command({id: 1, command: 'c'}, function(err2) {
        should.not.exist(err2);
        client.server.kill('SIGKILL');
        setTimeout(() => {
          client.command({id: 2, command: 'c'}, function(err3) {
            should.not.exist(err3);
            run_server_fn.should.be.calledOnce();
            done();
          });
        }, 50);
      });
    });
  });
  itAsync('all posible commands', function*() {
    let client = yield new Promise(
      pr_done => SocketClient.get(getSocketClientParams(), (err, cl) => {
        should.not.exist(err);
        pr_done(cl);
      })
    );
    const command = (...args) => new Promise(pr_done => {
      client.command(...args, (err, val) => pr_done([err, val]));
    });
    let [err, val] = yield command({id: 0, command: 't', vals: ['{"type":"memory"}']});
    should.not.exist(err);
    should(val.command).be.eql('t');
    [err, val] = yield command({id: 1, command: 's', keys: ['key'], vals: ['vall']});
    should.not.exist(err);
    should(val.command).be.eql('s');
    [err, val] = yield command({id: 2, command: 'g', keys: ['key']});
    should.not.exist(err);
    should(val.command).be.eql('g');
    [err, val] = yield command({id: 3, command: 'd', keys: ['key']});
    should.not.exist(err);
    should(val.command).be.eql('d');
    [err, val] = yield command({id: 4, command: 'g', keys: ['key']});
    should.not.exist(err);
    should(val.command).be.eql('g');
    [err, val] = yield command({id: 5, command: 'c'});
    should.not.exist(err);
    should(val.command).be.eql('c');
    [err, val] = yield command({id: 6, command: ''});
    should.not.exist(err);
    should(val.command).be.eql('e');
  });
});
