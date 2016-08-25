'use strict';

const child_process = require('child_process');
const path = require('path');
const sockets = require('./sockets.js');

/**
 * Wrapper over sockets with Storage api 
 */
class SocketStorageWrapper {
  /**
   * @param {Object} params
   * @param {String} [params.socket_path=node-mcache.sock] - used unix socket path
   * @param {Boolean} [params.create_server=true] - create server on first client connect 
   * @param {Boolean} [params.only_server=false] - only create server, without client
   * @param {Object} [params.storage_params] - storage params
   */
  constructor(params) {
    ({
      socket_path: this.socket_path = 'node-mcache.sock',
      create_server: this.create_server = true,
      only_server: this.only_server = false,
      storage_params: this.storage_params = {type: 'memory'}
    } = params);
    this.send_fn = null;
    this.client = null;
    this.server = null;
    this.messages_counter = 0;
  }

  /**
   * establish client connection and run server if necessary
   * if only_server options - only run server
   * @param  {Function} callback 
   */
  init(callback) {
    this.only_server ? this._runServer(callback) : this._runClient(callback);
  }

  _runClient(callback, second_try = false) {
    this.client && this.client.destroy();
    this.client = sockets.createClient(this.socket_path, (create_client_err, send_fn) => {
      if (create_client_err) {
        if (this.create_server && 
          (create_client_err.code == 'ENOENT' || create_client_err.code == 'ECONNREFUSED') && 
          !second_try) {
          // no server - run it
          this._runServer(err => {
            if (err && err != 'server already running') {
              if (callback) return callback(err);
              throw create_client_err;
            }
            this._runClient(callback, true);
          });
        } else if (callback) {
          callback(create_client_err);
        } else {
          throw create_client_err;
        }
      } else {
        this.send_fn = send_fn;
        callback && callback();
      }
    });
  }

  _runServer(callback) {
    this.server && this.server.kill();
    this.server = child_process.fork(path.resolve(__dirname, './server.js'));
    this.server.send({
      socket_path: this.socket_path,
      params: this.storage_params
    });
    this.server.once('message', msg => callback(msg.error));
  }

  _command(params, callback, second_try = false) {
    this.send_fn(params, (send_err, val) => {
      if (send_err && (send_err.code == 'EPIPE' || send_err.code == 'ECONNRESET') && !second_try) {
        // connection down - try to reconnect
        setTimeout(() => {
          this._runClient(err => {
            if (err) return callback(err);
            this._command(params, callback, true);
          });
        }, 50); 
      } else if (send_err) {
        callback(send_err);
      } else {
        this._commandProcess(params, val, callback);
      }
    });
  }

  _commandProcess(params, data, callback) {
    if (data.command == 'e') {
      let err = new Error(data.vals[0]);
      if (callback) {
        callback(err);
      } else {
        throw err;
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
    } else {
      callback && callback();
    }
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
      id: this.messages_counter++,
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
      id: this.messages_counter++,
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
      id: this.messages_counter++,
      command: 'd',
      keys
    }, callback);
  }

  /**
   * run gc
   */
  gc() {
    this._command({
      id: this.messages_counter++,
      command: 'c'
    });
  }
}

module.exports = SocketStorageWrapper;
