'use strict';
const crypto = require('crypto');
const os = require('os');
const zmq = require('zmq');
const tcp_exp = /tcp:\/\/[\d.]+:(\d+)\/?/;
const vm_exp = /VMware/;
const localip_exp = /0\.0\.0\.0/
const tcp_proto = 'tcp://';

exports.get_random = function(){
	return crypto.randomBytes(20).toString('hex')
};

exports.list_local_ips = function(){
	let ips = [];
	let interfaces = os.networkInterfaces()
	for(let iface_name in interfaces){
		if(vm_exp.test(iface_name)){ continue }
		let addrs = interfaces[ iface_name ];
		for(let a in addrs){
			let iface = addrs[a]
			if(!iface.internal && iface.family == 'IPv4'){
				ips.push(iface.address)
			}
		}
	}
	return ips;
};
exports.get_local_endpoint = function(sock){
	let addr = sock.getsockopt(zmq.ZMQ_LAST_ENDPOINT);
	if(tcp_proto.test( addr )){
		return addr 
	}

	// resolve to a locally reachable IP if tcp://
	let ip = this.list_local_ips()[0];
	return addr.replace(localip_exp, `${ip}`);
}
exports.get_port = function(addr){
	let m = addr.match(tcp_exp);
	return m ? Number(m[1]) : -1
}

exports.bindAndGetAddr = function(sock_type, addr){
	let sock = zmq.socket(sock_type);
	sock.bindSync(addr);
	let endpoint = sock.getsockopt(zmq.ZMQ_LAST_ENDPOINT);
	let port = exports.get_port(addr);
	return [sock, endpoint, port];
}
