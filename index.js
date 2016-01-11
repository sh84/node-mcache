var assert = require("assert");
 
function MemoryCache(ttl, gc_time, set_function) {
	assert(parseInt(ttl) > 0, 'ttl must be > 0');
	assert(set_function instanceof Function, 'set_function must be function');

	if (ttl.toString().indexOf('ms') == -1) {
		this.ttl = ttl*1000;
	} else {
		this.ttl = parseInt(ttl);
	}
	this.set_function = set_function;
	this.data = {};
	if (gc_time) this.gc_timer = setInterval(MemoryCache.prototype.clearOld.bind(this), gc_time*1000);
}

MemoryCache.prototype.get = function(key, callback) {
	if (Array.isArray(key)) {
		this.get_many(key, callback);
	} else {
		this.get_one(key, callback);
	}
};

MemoryCache.prototype.get_many = function(keys, callback) {
	var time = Date.now();
	var to_get = [];
	for(var i=0; i < keys.length; i++) {
		var key = keys[i];
		var obj = this.data[key];
		if (!obj || obj.t && time - obj.t > this.ttl) to_get.push(key);
	}
	if (to_get.length == 0) {
		var result = {};
		for(var i=0; i < keys.length; i++) {
			result[keys[i]] = this.data[keys[i]].v;
		}
		if (callback) callback(null, result);
		return result;
	} else {
		var _this = this;
		this.set_function(to_get, function(err, data) {
			if (err) {
				if (callback) callback(err);
			} else {
				time = Date.now();
				for(var i=0; i < to_get.length; i++) {
					_this.data[to_get[i]] = {
						v: data[i],
						t: time
					};
				}
				var result = {};
				for(var i=0; i < keys.length; i++) {
					result[keys[i]] = _this.data[keys[i]].v;
				}
				if (callback) callback(null, result);
			}
		});
	}
	return null;
};

MemoryCache.prototype.get_one = function(key, callback) {
	var time = Date.now();
	var obj = this.data[key];
	// obj.t - time when data were setted
	// obj.v - value
	// obj.l - query of get callbacks
	if (obj) {
		if (obj.t) {
			// data is available
			if (time - obj.t > this.ttl) {
				// expired
				delete this.data[key];
				obj = null;
				this.get(key, callback);
			} else {
				if (callback) callback(null, obj.v, obj.t);
				return obj.v;
			}
		} else {
			// no data in memory, but set_function in progress - push callback in query
			if (callback) obj.l.push(callback);
		}
	} else {
		// no data in memory, but set_function in progress - push callback in query
		obj = this.data[key] = {l: []};
		if (callback) obj.l.push(callback);
		var _this = this;
		this.set_function(key, function(err, data) {
			if (err) {
				for(var i in obj.l) {
					obj.l[i](err);
				}
				delete _this.data[key];
				obj = null;
			} else {
				obj.v = data;
				obj.t = Date.now();
				for(var i in obj.l) {
					obj.l[i](null, obj.v, obj.t);
				}
				delete obj.l;
				obj = null;
			}
		});
	}
	return null;
};

MemoryCache.prototype.set = function(key, val) {
	var time = Date.now();
	if (this.data[key] && this.data[key].l) {
		for(var i in this.data[key].l) {
			this.data[key].l[i](null, val, time);
		}
	}
	delete this.data[key];
	this.data[key] = {
		v: val,
		t: time
	};
};

MemoryCache.prototype.del = function(key) {
	delete this.data[key];
};

// update set time
MemoryCache.prototype.updateTime = function(key) {
	this.data[key].t = Date.now();
};

// get keys count
MemoryCache.prototype.size = function() {
	return Object.keys(this.data).length;
};


// get all data in hash
MemoryCache.prototype.hash = function() {
	var r = {};
	for (var i in this.data) {
		if (this.data[i].v) r[i] = this.data[i].v;
	}
	return r;
};

// delete all expired data
MemoryCache.prototype.clearOld = function() {
	var time = Date.now();
	for (var i in this.data) {
		if (this.data[i].t && time - this.data[i].t > this.ttl) {
			delete this.data[i];
		}
	}
};

module.exports = MemoryCache;
