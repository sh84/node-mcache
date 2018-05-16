'use strict';

const crypto = require('crypto');
const path = require('path');
const SocketClient = require('../lib/socket_client.js');

const default_socket_path = 'node-mcache.sock';
const default_pid_file_path = 'node-mcache-server.pid';

/**
 * Wrapper over sockets with Storage api 
 */
class SocketStorageWrapper {
  /**
   * @param {Object} params
   * @param {String} [params.socket_path=node-mcache.sock] - used unix socket path
   * @param {String} [params.pid_file_path=node-mcache-server.pid] - used pid file path
   * @param {Boolean} [params.create_server_on_connect=true] - create server on first client connect, in forked process
   * @param {Boolean} [params.only_server=false] - only create server, without client, in current process
   * @param {Boolean} [params.storage_hash] - storage uniq hash
   * @param {Object} [params.storage_params] - storage params
   */
  constructor(params) {
    ({
      socket_path: this.socket_path = default_socket_path,
      pid_file_path: this.pid_file_path = default_pid_file_path,
      only_server: this.only_server = false,
      storage_hash: this.storage_hash,
      storage_params: this.storage_params = {type: 'memory'}
    } = params);
    this.params = Object.assign({}, params);
    if (typeof this.storage_hash == 'undefined')
      this.storage_hash = crypto.createHash('md5').update(new Error().stack).digest('hex');
    this.socket_client = null;
    this.storage_id = null;
  }

  /**
   * establish client connection and run server if necessary
   * if only_server options - only run server in current process
   * @param  {Function} callback 
   */
  init(callback) {
    if (!this.only_server) {
      let params = Object.assign({}, this.params, {
        socket_path: this.socket_path, pid_file_path: this.pid_file_path
      });
      SocketClient.get(params, (err, client) => {
        if (err) return callback(err);
        this.socket_client = client;
        this.setStorageID(callback);
      });
    } else {
      const server_lib = require(path.resolve(__dirname, './server.js'));
      server_lib.run(this.pid_file_path, this.socket_path, callback); 
      return server_lib;
    }
  }

  setStorageID(callback) {
    this._command({
      id: this.socket_client.messages_counter++,
      command: 't',
      keys: [this.storage_hash],
      vals: [JSON.stringify(this.storage_params)]
    }, callback);
  }

  _command(params, callback) {
    this.socket_client.command(params, (send_err, data) => {
      if (send_err) {
        callback(send_err);
      } else if (data.command == 'e') {
        if (data.vals[0] == 'storage not initialized') {
          this.setStorageID(err => {
            if (err) return callback(err);
            this._command(params, callback);
          });
        } else {
          let err = new Error(data.vals[0]);
          if (callback) {
            callback(err);
          } else {
            throw err;
          }
        }
      } else if (data.command == 'g') {
        let result = Object.create(null);
        for (var i=0; i < data.keys.length; i++) {
          let key = data.keys[i];
          let val = data.vals[i];
          result[key] = {
            available: true,
            value: val
          };
        }
        for (var j=0; j < params.keys.length; j++) {
          let key = params.keys[j];
          if (!result[key]) result[key] = {available: false};
        }
        callback && callback(null, result);
      } else if (data.command == 't') {
        this.storage_id = data.vals[0];
        callback && callback();
      } else {
        callback && callback();
      }
    });
  }

  /**
   * get values by keys
   * @param  {String[]} keys     - Array of string keys
   * @param  {Function} callback - Called with (error, data), where data is hash
   *   {key: { 
   *     available: <boolean>,
   *     value: <value>
   *   }}
   */
  get(keys, callback) {
    this._command({
      id: this.socket_client.messages_counter++,
      storage_id: this.storage_id,
      command: 'g',
      keys
    }, callback);
  }

  /**
   * set values
   * @param  {Object} vals     - {key: value} hash
   * @param  {Function} [callback] - Called with (error)
   */
  set(obj, callback) {
    let keys = Object.keys(obj);
    let vals = new Array(keys.length);
    for (var i=0; i < keys.length; i++) {
      vals[i] = obj[keys[i]];
    }
    this._command({
      id: this.socket_client.messages_counter++,
      storage_id: this.storage_id,
      command: 's',
      keys,
      vals
    }, callback);
  }

  /**
   * del values
   * @param  {String[]} keys   - Array of string keys
   * @param  {Function} [callback] - Called with (error)
   */
  del(keys, callback) {
    this._command({
      id: this.socket_client.messages_counter++,
      storage_id: this.storage_id,
      command: 'd',
      keys
    }, callback);
  }

  /**
   * run gc
   */
  gc() {
    this._command({
      id: this.socket_client.messages_counter++,
      storage_id: this.storage_id,
      command: 'c'
    });
  }
}

module.exports = SocketStorageWrapper;
