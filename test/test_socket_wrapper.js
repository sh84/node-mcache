/* eslint-env node, mocha */
'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');

const SocketStorageWrapper = require('../lib/socket_storage_wrapper.js');

describe('Sockets wrapper', function() {
  it('create server for first client and not for second', function(done) {
    let wrapper = new SocketStorageWrapper({
      socket_path: 'wrapper_test1.sock'
    });
    let run_server_fn = sinon.spy(wrapper, '_runServer');
    wrapper.init(function(err) {
      should.not.exist(err);
      run_server_fn.should.be.calledOnce();
      wrapper.client.should.be.ok();
      wrapper.server.should.be.ok();
      let wrapper2 = new SocketStorageWrapper({
        socket_path: 'wrapper_test1.sock'
      });
      let run_server2_fn = sinon.spy(wrapper2, '_runServer');
      wrapper.init(function(err2) {
        should.not.exist(err2);
        run_server2_fn.should.not.be.called();
        wrapper.client.should.be.ok();
        wrapper.server.should.be.ok();
        done();
      });
    });
  });
  it('reconnect && recreate on server done', function(done) {
    let wrapper = new SocketStorageWrapper({
      socket_path: 'wrapper_test2.sock'
    });
    let run_server_fn = sinon.spy(wrapper, '_runServer');
    wrapper.init(function(err) {
      should.not.exist(err);
      run_server_fn.should.be.calledOnce();
      wrapper.client.should.be.ok();
      wrapper.server.should.be.ok();
      wrapper._command({id: 0, command: 'c'}, function(err2) {
        should.not.exist(err2);
        wrapper.server.kill();
        setTimeout(() => {
          wrapper._command({id: 1, command: 'c'}, function(err3) {
            should.not.exist(err3);
            run_server_fn.should.be.calledTwice();
            done();
          });
        }, 50);
      });
    });
  });
  it('not create server', function(done) {
    let wrapper = new SocketStorageWrapper({
      socket_path: 'wrapper_test3.sock',
      create_server: false
    });
    let run_server_fn = sinon.spy(wrapper, '_runServer');
    wrapper.init(function(err) {
      err.code.should.be.equal('ENOENT');
      run_server_fn.should.not.be.called();
      done();
    });
  });
  it('separately created server', function(done) {
    let server = new SocketStorageWrapper({
      socket_path: 'wrapper_test4.sock',
      ttl: 100,
      only_server: true
    });
    let server_run_server_fn = sinon.spy(server, '_runServer');
    let client = new SocketStorageWrapper({
      socket_path: 'wrapper_test4.sock',
      create_server: false
    });
    let client_run_server_fn = sinon.spy(client, '_runServer');
    server.init(function(err) {
      should.not.exist(err);
      server_run_server_fn.should.be.calledOnce();
      client.init(function(err2) {
        should.not.exist(err2);
        client_run_server_fn.should.not.be.called();
        client._command({id: 0, command: 's', keys: ['key'], vals: ['vall']}, function() {
          client._command({id: 1, command: 'g', keys: ['key']}, function() {
            client._command({id: 2, command: 'd', keys: ['key']}, function() {
              client._command({id: 3, command: 'g', keys: ['key']}, function() {
                client._command({id: 4, command: 'c'}, function(err3) {
                  done(err3);
                });
              });
            });
          });
        });
      });
    });
  });
  it('kill server', function(done) {
    let wrapper = new SocketStorageWrapper({
      socket_path: 'wrapper_test5.sock',
      only_server: true
    });
    wrapper.init(function() {
      wrapper.server.kill('SIGKILL');
      let wrapper2 = new SocketStorageWrapper({
        socket_path: 'wrapper_test5.sock',
        only_server: true
      });
      wrapper2.init(done);
    });
  });
});
