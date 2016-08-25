'use strict';

const fs = require('fs');
const net = require('net');
const EncDec = require('./encdec.js');

/**
 * Create server
 * @param  {String} socket_path  
 * @param  {Function} msg_callback - called on every incoming message, 
 *                                   with msg object and send function params
 * @param  {Function} callback - called on server ready or error
 */
module.exports.createServer = function(socket_path, msg_callback, callback) {
  let callback_not_called = true;
  let connections = [];
  fs.existsSync(socket_path) && fs.unlinkSync(socket_path);
  let server = net.createServer(connection => {
    connection.setEncoding('utf8');
    let encdec = new EncDec();
    const send_fn = function(msg) {
      connection.write(encdec.encode(msg));
    };
    connection.on('data', data => {
      let msgs = encdec.decode(data);
      for (var i=0; i < msgs.length; i++) {
        msg_callback(msgs[i], send_fn);
      }
    });
    connections.push(connection);
  });
  server.on('error', (err) => {
    server.close();
    fs.existsSync(socket_path) && fs.unlinkSync(socket_path);
    if (callback_not_called) {
      callback_not_called = false;
      return callback && callback(err);
    }
    throw err;
  });
  server.listen(socket_path, () => {
    callback_not_called && callback && callback(null, connections);
    callback_not_called = false;
  });
  return server;
};

/**
 * Create client
 * @param  {String}   socket_path
 * @param  {Function} callback - called on ready with send function param
 *                               or on error
 */
module.exports.createClient = function(socket_path, callback) {
  let encdec = new EncDec();
  let answer_callbacks = new Map();
  let callback_not_called = true;
  let connection = net.createConnection(socket_path, () => {
    callback_not_called && callback(null, function(msg, answer_callback) {
      answer_callbacks.set(msg.id, answer_callback);
      connection.write(encdec.encode(msg));
    });
    callback_not_called = false;
  });
  connection.setEncoding('utf8');
  connection.on('data', data => {
    let msgs = encdec.decode(data);
    for (var i=0; i < msgs.length; i++) {
      let msg = msgs[i];
      let answer_callback = answer_callbacks.get(msg.id);
      if (answer_callback) {
        answer_callbacks.delete(msg.id);
        answer_callback(null, msg);
      }
    }    
  });
  connection.on('error', err => {
    callback_not_called && callback(err);
    callback_not_called = false;
    for (let msg_id of answer_callbacks.keys()) 
      answer_callbacks.get(msg_id)(err);
    answer_callbacks.clear();
  });
  connection.on('close', (had_error) => {
    if (callback_not_called) {
      let err_msg = had_error ? 'Close connection with error' : 'Close connection';
      callback(new Error(err_msg));
      callback_not_called = false;
    }
  });

  return connection;
};
