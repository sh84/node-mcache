/* eslint-env node, mocha */
'use strict';

require('should');

const EncDec = require('../lib/encdec.js');

describe('EncDec', function() {
  describe('Decoder', function() {
    it('simple', function() {
      let dec = new EncDec();
      dec.decode('').should.be.eql([]);
      dec.decode('00000003').should.be.eql([]); // id
      dec.decode('0009').should.be.eql([]);     // server id
      dec.decode('c').should.be.eql([]);        // command
      dec.decode('0001').should.be.eql([]);     // key count
      dec.decode('0001').should.be.eql([]);     // val count
      dec.decode('000002').should.be.eql([]);   // key length
      dec.decode('Ёй').should.be.eql([]);       // key
      dec.decode('000005').should.be.eql([]);   // val length
      dec.decode('~Q \\"bla').should.be.eql([{  // val
        id: 3,
        storage_id: 9,
        command: 'c',
        keys: ['Ёй'],
        vals: ['~Q \\"']
      }]);
      dec.buf.should.be.eql('bla');
    });
  });
  describe('Encoder', function() {
    it('simple', function() {
      let enc = new EncDec();
      enc.encode({}).should.be.eql('000000000000 00000000');
      enc.encode({
        id: 2,
        storage_id: 3,
        command: 'qwerty',
        keys: ['Ё']
      }).should.be.eql('000000020003q00010000000001Ё');
    });
  });
  describe('Decoder + Encoder', function() {
    it('simple', function() {
      let enc = new EncDec();
      enc.decode(enc.encode({id: ''})).should.be.eql([{
        id: 0,
        storage_id: 0,
        command: ' ',
        keys: [],
        vals: []
      }]);
      enc.decode(enc.encode({
        id: 2821109907455,
        storage_id: 1679615,
        command: 'qwerty',
        keys: [1, 2],
        vals: ['', 0, '~!*=-(qwetyuioplkjhgfdsazxcvbnm) `"']
      })).should.be.eql([{
        id: 2821109907455,
        storage_id: 1679615,
        command: 'q',
        keys: ['1', '2'],
        vals: ['', '0', '~!*=-(qwetyuioplkjhgfdsazxcvbnm) `"']
      }]);
    });
    it('random many', function() {
      let enc = new EncDec();
      let messages_in = [];
      let data = '';
      let genChar = () => String.fromCharCode(Math.floor(Math.random() * 256));
      let genString = function() {
        let str_len = Math.floor(Math.random() * 64);
        var str = '';
        for (var i = 0; i < str_len; i++) str += genChar();
        return str;
      };
      let genArr = function() {
        let count = Math.floor(Math.random() * 32);
        var arr = Array(count);
        for (var i = 0; i < count; i++) arr[i] = genString();
        return arr;
      };
      for (let id=0; id<50; id++) {
        let msg = {id, storage_id: 666, command: genChar(), keys: genArr(), vals: genArr()};
        messages_in.push(msg);
        data += enc.encode(msg);
      }
      let messages_out = [], pos = 0;
      while (pos < data.length) {
        let count = Math.ceil(Math.random() * 33);
        let piece = data.substr(pos, count);
        messages_out = messages_out.concat(enc.decode(piece));
        pos += count;
      }
      messages_out.should.be.eql(messages_in);
    });
  });
});
