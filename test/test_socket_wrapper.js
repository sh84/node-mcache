/* eslint-env node, mocha */
'use strict';

const should = require('should');
require('should-sinon');
const {itAsync, noProtObj} = require('./helper.js');

const SocketStorageWrapper = require('../lib/socket_storage_wrapper.js');

function getWrapperParams(params = {}) {
  getWrapperParams.count = getWrapperParams.count ? getWrapperParams.count + 1 : 1;
  return Object.assign({
    socket_path: `wrapper_test${getWrapperParams.count}.sock`,
    pid_file_path: `wrapper_test${getWrapperParams.count}.pid`
  }, params);
}

function should_be_val(result, key, val) {
  should(result).be.eql(noProtObj({[key]: {available: true, value: val}}));
}

function should_be_unavailable(result, key) {
  should(result).be.eql(noProtObj({[key]: {available: false}}));
}

describe('Sockets wrapper', function() {
  it('not create server', function(done) {
    let client = new SocketStorageWrapper(getWrapperParams({create_server_on_connect: false}));
    client.init(function(err) {
      should.not.exist(client.socket_client);
      err.code.should.be.equal('ENOENT');
      done();
    });
  });
  it('inplace server and fork server', function(done) {
    let params = getWrapperParams({storage_hash: '1'});
    let client1 = new SocketStorageWrapper(Object.assign({}, params, {only_server: true}));
    let server_lib = client1.init(err => {
      should.not.exist(err);
      let client2 = new SocketStorageWrapper(params);
      client2.init(function(err2) {
        should.not.exist(err2);
        should.not.exist(client2.socket_client.server);
        server_lib.close(false);
        done();
      });
    });
  });

  it('same storage_hash - same storage_id', function(done) {
    let params = getWrapperParams({storage_hash: '1'});
    let client1 = new SocketStorageWrapper(params);
    client1.init(function(err) {
      should.not.exist(err);
      client1.storage_id.should.be.eql('0');
      let client2 = new SocketStorageWrapper(params);
      client2.init(function(err2) {
        should.not.exist(err2);
        client2.storage_id.should.be.eql('0');
        done();
      });
    });
  });

  it('different storage_hash - different storage_id', function(done) {
    let params = getWrapperParams({storage_hash: '1'});
    let client1 = new SocketStorageWrapper(params);
    client1.init(function(err) {
      should.not.exist(err);
      client1.socket_client.client.should.be.ok();
      client1.socket_client.server.should.be.ok();
      client1.storage_id.should.be.eql('0');
      let client2 = new SocketStorageWrapper(Object.assign({}, params, {storage_hash: '2'}));
      client2.init(function(err2) {
        should.not.exist(err2);
        client2.socket_client.client.should.be.ok();
        client2.storage_id.should.be.eql('1');
        should.not.exist(client2.server);
        done();
      });
    });
  });

  itAsync('same storage_hash - same storage', function*() {
    let params = getWrapperParams({
      storage_hash: 'storage_hash',
      storage_params: {type: 'memory', ttl: 100}
    });
    let client = new SocketStorageWrapper(params);
    const command = (...args) => new Promise(pr_done => {
      client._command(...args, (err, val) => pr_done([err, val]));
    });
    should.not.exist(yield new Promise(pr_done => client.init(pr_done)));
    
    let err, result;
    [err] = yield command({id: 1, storage_id: client.storage_id, command: 's', keys: ['key'], vals: ['val']});
    should.not.exist(err);
    [err, result] = yield command({id: 2, storage_id: client.storage_id, command: 'g', keys: ['key']});
    should_be_val(result, 'key', 'val');
    should.not.exist(yield new Promise(pr_done => client.setStorageID(pr_done)));
    [err, result] = yield command({id: 4, storage_id: client.storage_id, command: 'g', keys: ['key']});
    should_be_val(result, 'key', 'val');
  });

  itAsync('separately created server with two storages', function*() {
    let params = getWrapperParams({only_server: true, storage_params: {type: 'memory', ttl: 100}});
    let server = new SocketStorageWrapper(params);
    let server_lib;
    should.not.exist(yield new Promise(pr_done => {
      server_lib = server.init(pr_done);
    }));

    params = Object.assign({}, params, {only_server: false, create_server: false});
    let client1 = new SocketStorageWrapper(
      Object.assign({}, params, {storage_hash: 'st1'})
    );
    const command1 = (...args) => new Promise(pr_done => {
      client1._command(...args, (err, val) => pr_done([err, val]));
    });
    should.not.exist(yield new Promise(pr_done => client1.init(pr_done)));
    should.not.exist(client1.socket_client.server);

    let client2 = new SocketStorageWrapper(
      Object.assign({}, params, {storage_hash: 'st2'})
    );
    const command2 = (...args) => new Promise(pr_done => {
      client1._command(...args, (err, val) => pr_done([err, val]));
    });
    should.not.exist(yield new Promise(pr_done => client2.init(pr_done)));
    should.not.exist(client2.socket_client.server);

    client1.socket_client.should.be.eql(client2.socket_client);
    should(client1.storage_id).be.eql('0');
    should(client2.storage_id).be.eql('1');

    let err, result;
    [err] = yield command1({id: 1, storage_id: client1.storage_id, command: 's', keys: ['key'], vals: ['val1']});
    should.not.exist(err);
    [err] = yield command1({id: 2, storage_id: client1.storage_id, command: 's', keys: ['key1'], vals: ['val2']});
    should.not.exist(err);
    [err] = yield command2({id: 3, storage_id: client2.storage_id, command: 's', keys: ['key'], vals: ['val3']});
    should.not.exist(err);
    [err] = yield command2({id: 4, storage_id: client2.storage_id, command: 's', keys: ['key2'], vals: ['val4']});
    should.not.exist(err);
    [err, result] = yield command1({id: 5, storage_id: client1.storage_id, command: 'g', keys: ['key']});
    should_be_val(result, 'key', 'val1');
    [err, result] = yield command1({id: 6, storage_id: client1.storage_id, command: 'g', keys: ['key1']});
    should_be_val(result, 'key1', 'val2');
    [err, result] = yield command1({id: 7, storage_id: client1.storage_id, command: 'g', keys: ['key2']});
    should_be_unavailable(result, 'key2');
    [err, result] = yield command1({id: 8, storage_id: client2.storage_id, command: 'g', keys: ['key']});
    should_be_val(result, 'key', 'val3');
    [err, result] = yield command1({id: 9, storage_id: client2.storage_id, command: 'g', keys: ['key1']});
    should_be_unavailable(result, 'key1');
    [err, result] = yield command1({id: 10, storage_id: client2.storage_id, command: 'g', keys: ['key2']});
    should_be_val(result, 'key2', 'val4');
    server_lib.close(false);
  });

  itAsync('restart separately created server and connected client', function*() {
    let params = getWrapperParams({only_server: true, storage_params: {type: 'memory', ttl: 100}});
    let server = new SocketStorageWrapper(params);
    let server_lib;
    should.not.exist(yield new Promise(pr_done => {
      server_lib = server.init(pr_done);
    }));

    let client = new SocketStorageWrapper(
      Object.assign({}, params, {only_server: false, create_server: false, storage_hash: 'st'})
    );
    const command = (...args) => new Promise(pr_done => {
      client._command(...args, (err, val) => pr_done([err, val]));
    });
    should.not.exist(yield new Promise(pr_done => client.init(pr_done)));
    should.not.exist(client.socket_client.server);

    let err, result;
    [err] = yield command({id: 1, storage_id: client.storage_id, command: 's', keys: ['key'], vals: ['val1']});
    should.not.exist(err);
    server_lib.close(false);
    server = new SocketStorageWrapper(params);
    should.not.exist(yield new Promise(pr_done => {
      server_lib = server.init(pr_done);
    }));
    [err, result] = yield command({id: 2, storage_id: client.storage_id, command: 'g', keys: ['key']});
    should.not.exist(err);
    should_be_unavailable(result, 'key');
    [err] = yield command({id: 3, storage_id: client.storage_id, command: 's', keys: ['key'], vals: ['val2']});
    should.not.exist(err);
    [err, result] = yield command({id: 4, storage_id: client.storage_id, command: 'g', keys: ['key']});
    should_be_val(result, 'key', 'val2');
    server_lib.close(false);
  });

  itAsync('reconnect to new server', function*() {
    const fs = require('fs');
    let params = getWrapperParams({only_server: true, storage_params: {type: 'memory', ttl: 100}});
    let server = new SocketStorageWrapper(params);
    let server_lib;
    should.not.exist(yield new Promise(pr_done => {
      server_lib = server.init(pr_done);
    }));

    let client = new SocketStorageWrapper(
      Object.assign({}, params, {only_server: false, create_server: false, create_server_on_connect: false, storage_hash: 'st'})
    );
    const command = (...args) => new Promise(pr_done => {
      client._command(...args, (err, val) => pr_done([err, val]));
    });
    should.not.exist(yield new Promise(pr_done => client.init(pr_done)));
    should.not.exist(client.socket_client.server);

    let err, result;
    server_lib.close(false);
    
    [err, result] = yield command({id: 2, storage_id: client.storage_id, command: 'g', keys: ['key']});
    err.should.be.ok();
    server = new SocketStorageWrapper(params);
    should.not.exist(yield new Promise(pr_done => {
      server_lib = server.init(pr_done);
    }));
    [err, result] = yield command({id: 2, storage_id: client.storage_id, command: 'g', keys: ['key']});
    should.not.exist(err);
    server_lib.close(false);
  });
});
