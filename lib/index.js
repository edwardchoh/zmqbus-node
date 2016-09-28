/*jshint esnext: true, laxcomma: true, node: true, smarttabs: true */
'use strict';
const nodes = require('./node');
const assert = require('assert');
const base_options = {
	type: 'tcp'
  , election_priority: 0
  , election_timeout: 2000
  , heartbeat_period: 2000
  , heartbeat_timeout: 6000
  , multicast_addr: '239.1.2.3'
  , multicast_port: 45555
  , pgm_addr: '239.1.2.4'
  , pgm_port: 45555
};

function isNumber(n){
	return !isNaN(parseFloat(n)) && isFinite(n);
}

exports.getOptions = function(options = {}){
	assert( typeof options == 'object','options must be an object' );

	// set options with base_options if not found
	let opts = Object.assign({}, base_options, options);

	// PGM/EPGM not supported yet
	if (opts.type !== 'tcp'){
		throw new Error('type must be tcp');
	}

	// check for numbers
	for( let a in ['election_timeout', 'heartbeat_period', 'heartbeat_timeout', 'multicast_port', 'pgm_port']){
		if(!isNumber(opts[a])){
			throw new Error(`${a} must be a number`);
		}
	}

	return opts;
};

exports.createNode = function(options = {}){
	let opts = exports.getOptions(opts)
	  , node
      ;

	if (opts.type == 'tcp'){
		node = new nodes.ElectedNode(opts);
	} else {
		node = new nodes.PgmNode(opts);
	}

	return node;
};
