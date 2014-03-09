mcache
=============

A simple and fast async memory cache for node.js
Call only one time set function for many simultaneous get requests.
It is designed for quick return of data from the memory - for get operations are performed minimal coding. 
Api built in asynchronous design, with callbacks. 

Install
=============

	npm install mcache

Examples
=============

###Abstract example

	var Mcache = require('mcache');
	// ttl = 600 sec, gc_time = 60 sec
	cache = new Mcache(60, 10, function(key, callback) {
		// this code will be executed at most once every 600 seconds
		var error = null;
		var value = ...;
		callback(error, value);
	});
	var id = ... ;
	cache.get(id, function(err, data) {
		console.log(err, data);
	});  

  
###Example with mysql
 
	var Mcache = require('mcache');
	// ttl = 60 sec, gc_time = 10 sec
	cache = new Mcache(60, 10, function(key, callback) {
		// this code will be executed at most once every 60 seconds
		mysql.query('SELECT ... WHERE id=?', key, callback);  
	});
	var id = ... ;
	cache.get(id, function(err, data) {
		console.log(err, data);
	});

### Multi keys and milliseconds ttl

	var Mcache = require('mcache');
	// ttl = 100 ms, gc_time = 60 sec
	cache = new Mcache('100 ms', 60, function(key, callback) {
		if (Array.isArray(key) {
			callback(null, [...]);
		} else {
			callback(null, data);
		}
	});
	var id = ... ;
	cache.get(id, function(err, data) {
		console.log(err, data);
	});
	var ids = [...];
	cache.get(ids, function(err, data) {
		console.log(err, data); // data = {key1: data1, ...}
	});

API
=============

## constructor(ttl, gc_time, setfunction) 
create new cache object

 * ttl - time to live for item, seconds
 * gc_time - interval for clear expired items, seconds
  Can be empty - you must call clearOld manually.
 * setfunction(key, callback) - function, get the value by the key, must call callback(error, value)
 
 
## get(key, callback)
get item from cache by key

 * key - can be any value
 * callback(error, value) - function

## set(key, val)
manual item setting without setfunction call

## del(key)
delete item

## updateTime(key)
update set_time (time when the function was called) to the current time

## size()
get items count

## hash()
get all items in hash

## clearOld()
delete all expired items
