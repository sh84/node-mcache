/* eslint-env node, mocha */
'use strict';

const should = require('should');
const sockets = require('../lib/sockets.js');

describe('Sockets', function() {
  let servers = [];
  it('correct send', function(done) {
    let server = sockets.createServer('test1.sock', (msg, send_fn) => {
      setTimeout(() => send_fn(msg), 10);
    }, create_server_err => {
      should.not.exist(create_server_err);
      sockets.createClient('test1.sock', (create_client_err, send) => {
        should.not.exist(create_client_err);
        let send_count = 2;
        send({id: 1, command: 't', keys: ['key1'], vals: ['val1']}, (send_err, msg) => {
          should.not.exist(send_err);
          msg.should.be.eql({
            id: 1,
            command: 't',
            keys: ['key1'],
            vals: ['val1']
          });
          send_count -= 1;
          !send_count && done();
        });
        send({id: 2, command: 't', keys: ['key2'], vals: ['val2']}, (send_err, msg) => {
          should.not.exist(send_err);
          msg.should.be.eql({
            id: 2,
            command: 't',
            keys: ['key2'],
            vals: ['val2']
          });
          send_count -= 1;
          !send_count && done();
        });
      });
    });
    servers.push(server);
  });
  it('no server error', function(done) {
    sockets.createClient('test2.sock', create_err => {
      create_err.should.be.ok();
      done();
    });
  });
  it('server destroyed error', function(done) {
    let server = sockets.createServer('test3.sock', (msg, send_fn) => {
      send_fn(msg);
    }, (create_server_err, connections) => {
      should.not.exist(create_server_err);
      sockets.createClient('test3.sock', (create_client_err, send) => {
        should.not.exist(create_client_err);
        connections.forEach(conn => conn.destroy());
        send({command: 't', keys: ['key3'], vals: ['val3']}, send_err => {
          send_err.should.be.ok();
          done();
        });
      });
    });
    servers.push(server);
  });
  it('sync client connect', function(done) {
    let server = sockets.createServer('test5.sock', (msg, send_fn) => {
      send_fn(msg);
    });
    sockets.createClient('test5.sock', (create_client_err, send) => {
      should.not.exist(create_client_err);
      send({id: 1, command: 't', keys: ['key'], vals: ['val']}, (send_err, msg) => {
        msg.should.be.eql({
          id: 1,
          command: 't',
          keys: ['key'],
          vals: ['val']
        });
        done(send_err);
      });
    });
    servers.push(server);
  });

  after(function() {
    servers.forEach(server => server.close());
  });
});
