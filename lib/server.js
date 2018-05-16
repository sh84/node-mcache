'use strict';

const fs = require('fs-ext');
const sockets = require('./sockets.js');

module.exports.pid_file_path = null;
module.exports.socket_path = null;
let server;
let server_connections;
let storages = [];
let storages_id_by_hash = {};

if (process.argv.includes('_run_mcache_server')) process.on('message', message => {
  module.exports.run(message.pid_file_path, message.socket_path, (error, _, exit) => {
    if (error) {
      process.send({error});
      if (exit) process.exit();
    } else {
      process.send({ready: true});
    }
  });
});

module.exports.run = function(pid_file_path, socket_path, callback) {
  if (server) return callback('server already running');
  let fd = fs.openSync(pid_file_path, 'w');
  fs.flock(fd, 'exnb', (err) => {
    if (err) return callback('server already running', null, true);
    fs.writeFileSync(fd, process.pid);
    module.exports.pid_file_path = pid_file_path;
    module.exports.socket_path = socket_path;
    server = sockets.createServer(socket_path, handleMsg, (err2, connections) => {
      server_connections = connections;
      callback(err2);
    });
  });
};

function handleMsg(msg, send_fn) {
  let storage = storages[msg.storage_id];
  if (msg.command == 't') {
    // start server
    let storage_hash = msg.keys[0];
    let params = JSON.parse(msg.vals[0]);
    let storage_id = storages_id_by_hash[storage_hash];
    if (typeof(storage_id) == 'undefined') {
      let Storage = require(`./${params.type}_storage.js`);
      storages_id_by_hash[storage_hash] = storage_id = storages.length;
      storage = storages[storage_id] = new Storage(params);
    }
    send_fn({id: msg.id, command: 't', vals: [storage_id]});
  } else if (!storage) {
    send_fn({id: msg.id, command: 'e', vals: ['storage not initialized']});
  } else if (msg.command == 'g') {
    // get commamd
    storage.get(msg.keys, (err, result) => {
      if (err) {
        send_fn({id: msg.id, command: 'e', vals: [err]});
      } else {
        let keys = Object.keys(result);
        let vals = [];
        let send_keys = [];
        for (var i=0; i < keys.length; i++) {
          let r = result[keys[i]];
          if (r.available) {
            send_keys.push(keys[i]);
            vals.push(r.value);
          }
        }
        send_fn({id: msg.id, command: 'g', keys: send_keys, vals});
      }
    });
  } else if (msg.command == 's') {
    // set commamd
    let obj = Object.create(null);
    for (var i=0; i < msg.keys.length; i++) {
      obj[msg.keys[i]] = msg.vals[i];
    }
    storage.set(obj, err => {
      if (err) {
        send_fn({id: msg.id, command: 'e', vals: [err]});
      } else {
        send_fn({id: msg.id, command: 's'});
      }
    });
  } else if (msg.command == 'd') {
    // del commamd
    storage.del(msg.keys, err => {
      if (err) {
        send_fn({id: msg.id, command: 'e', vals: [err]});
      } else {
        send_fn({id: msg.id, command: 'd'});
      }
    });
  } else if (msg.command == 'c') {
    // gc commamd
    storage.gc(err => {
      if (err) {
        send_fn({id: msg.id, command: 'e', vals: [err]});
      } else {
        send_fn({id: msg.id, command: 'c'});
      }
    });
  } else {
    send_fn({id: msg.id, command: 'e', vals: ['unknown command']});
  }
}

module.exports.close = function(exit = true) {
  server && server.close();
  server_connections && server_connections.forEach(connection => connection.destroy());
  server = null;
  storages = [];
  storages_id_by_hash = {};
  fs.existsSync(module.exports.pid_file_path) && fs.unlinkSync(module.exports.pid_file_path);
  exit && setImmediate(() => process.exit());  
};

process.on('disconnect', () => module.exports.close());
process.on('exit', () => module.exports.close());
process.on('SIGTERM', () => module.exports.close());
