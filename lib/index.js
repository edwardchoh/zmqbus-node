/*jshint esnext: true, laxcomma: true, node: true, smarttabs: true */
'use strict';
const Node = require('./node');
const assert = require('assert');

exports.getOptions = function(options = {}){
	let opts = Object.assign({}, base_options, options);

	// check for numbers
	for( let a of ['election_timeout', 'heartbeat_period', 'heartbeat_timeout', 'multicast_port', 'pgm_port']){
		if(!isNumber(opts[a])){
			throw new Error(`${a} must be a number`);
		}
	}

	return opts;
};

exports.createNode = function(options = {}){
	let opts = exports.getOptions(options);
	return new Node(opts);
};
