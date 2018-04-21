'use strict';

const child_process = require('child_process');
const path = require('path');
const sockets = require('./sockets.js');
const FunctionsQueue = require('./functions_queue.js');

const default_socket_path = 'node-mcache.sock';
const default_pid_file_path = 'node-mcache-server.pid';

let clients = {};
let ready_queue = new FunctionsQueue();

/**
 * Client for socket server
 */
class SocketClient {
  /**
   * @param {Object} params
   * @param {String} [params.socket_path=node-mcache-<Date.now>.sock] - used unix socket path
   * @param {String} [params.pid_file_path=node-mcache-server.pid] - used pid file path
   * @param {Boolean} [params.create_server_on_connect=true] - create server on first client connect, in forked process
   */
  constructor(params) {
    ({
      socket_path: this.socket_path = default_socket_path,
      pid_file_path: this.pid_file_path = default_pid_file_path,
      create_server_on_connect: this.create_server_on_connect = true
    } = params);
    this.send_fn = null;
    this.client = null;
    this.server = null;
    this.messages_counter = 0;
  }

  /**
   * get SocketClient instance, establish client connection and run server if necessary
   * @param {Object} params
   * @param {String} [params.socket_path=node-mcache-<Date.now>.sock] - used unix socket path
   * @param {String} [params.pid_file_path=node-mcache-server.pid] - used pid file path
   * @param {Boolean} [params.create_server_on_connect=true] - create server on first client connect, in forked process
   * @param {Function} callback 
   */
  static get(params, callback) {
    let key = `${params.pid_file_path}##${params.socket_path}`;
    if (clients[key]) return callback(null, clients[key]);

    // push callback to queue
    let queue_length = ready_queue.add(key, (err, _, value) => callback(err, value));
    // only for first call make connect
    if (queue_length > 1) return;

    let client = new SocketClient(params);
    client.runClient(err => {
      if (!err) clients[key] = client;
      ready_queue.run(key, err, client);
    });
  }

  runClient(callback, second_try = false) {
    this.client && this.client.destroy();
    this.client = sockets.createClient(this.socket_path, (create_client_err, send_fn) => {
      if (create_client_err) {
        if (this.create_server_on_connect && !second_try &&
          (create_client_err.code == 'ENOENT' || create_client_err.code == 'ECONNREFUSED') ) {
          // no server - run it
          this.runForkServer(err => {
            if (err && err != 'server already running') {
              if (callback) return callback(err);
              throw err;
            }
            setTimeout(() => this.runClient(callback, true), 100);
          });
        } else if (callback) {
          callback(create_client_err);
        } else {
          throw create_client_err;
        }
      } else {
        this.send_fn = send_fn;
        if (callback) callback();
      }
    });
  }

  runForkServer(callback) {
    if (this.server && !this.server.connected) {
      this.server.kill();
      this.server = null;
    }
    if (!this.server) this.server = child_process.fork(
      path.resolve(__dirname, './server.js'), ['_run_mcache_server']
    );
    this.server.send({
      socket_path: this.socket_path,
      pid_file_path: this.pid_file_path
    });
    this.server.once('message', msg => callback(msg.error));
  }

  command(params, callback, second_try = false) {
    this.send_fn(params, (send_err, val) => {
      if (send_err && (send_err.code == 'EPIPE' || send_err.code == 'ECONNRESET') && !second_try) {
        // connection down - try to reconnect
        setTimeout(() => {
          this.runClient(err => {
            if (err) return callback(err);
            this.command(params, callback, true);
          });
        }, 50); 
      } else {
        callback(send_err, val);
      }
    });
  }
}

module.exports = SocketClient;
