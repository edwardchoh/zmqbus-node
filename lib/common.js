'use strict';
const crypto = require('crypto')
    , os          = require('os')
    , zmq         = require('zmq')
    , tcp_exp     = /tcp:\/\/[\d.]+:(\d+)\/?/
    , vm_exp      = /VMware/
    , localip_exp = /0\.0\.0\.0/
    , tcp_proto   = 'tcp://'
    ;

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
    let addr, ip;
    addr = sock.getsockopt(zmq.ZMQ_LAST_ENDPOINT);
    if(tcp_proto.test( addr )){
        return addr 
    }

    // resolve to a locally reachable IP if tcp://
    ip = this.list_local_ips()[0];
    return addr.replace(localip_exp, `${ip}`);
}
exports.get_port = function(addr){
    let m = addr.match(tcp_exp);
    return m ? Number(m[1]) : -1
}

exports.bindAndGetAddr = function(sock_type, addr){
    let sock, endpoint, port;

    sock = zmq.socket(sock_type);
    sock.bindSync(addr);
    endpoint = sock.getsockopt(zmq.ZMQ_LAST_ENDPOINT);
    port = exports.get_port(addr);
    return [sock, endpoint, port];
}

exports.lpad = function(value, padding){
    zeroes = '0'
    zeroes += '0' for i in [1..padding]
    return (zeroes + value).slice(padding * - 1)
}
