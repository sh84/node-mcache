'use strict';

const sockets = require('./sockets.js');

if (!process.send) throw new Error('Cant be run from main process, only from fork');

process.on('disconnect', close);
process.on('exit', close);
process.on('SIGTERM', close);

let server, storage;
process.on('message', message => {
  if (storage) return process.send({error: 'server already running'});
  const Storage = require(`./${message.params.type}_storage.js`);
  storage = new Storage(message.params);
  server = sockets.createServer(message.socket_path, handleMsg, create_server_err => {
    if (!create_server_err) return process.send({ready: true});
    process.send({error: create_server_err});
    process.nextTick(() => close());
  });
});

function handleMsg(msg, send_fn) {
  if (msg.command == 'g') {
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
    storage.del(msg.keys, err => {
      if (err) {
        send_fn({id: msg.id, command: 'e', vals: [err]});
      } else {
        send_fn({id: msg.id, command: 'd'});
      }
    });
  } else if (msg.command == 'c') {
    storage.gc(err => {
      if (err) {
        send_fn({id: msg.id, command: 'e', vals: [err]});
      } else {
        send_fn({id: msg.id, command: 'c'});
      }
    });
  }
}

function close() {
  server.close();
  setImmediate(() => process.exit());  
}
