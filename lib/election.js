/*jshint laxcomma: true, smarttabs: true, node: true, esnext: true*/
'use strict';
/**
 * Class to handler leader elections
 * @module zmqbus/lib/election
 * @author Edward Choh
 * @author Eric Satterwhite
 * @since 0.0.1
 * @requires dgram
 * @requires events
 * @requires zmqbus/lib/common
 */

const dgram          = require('dgram')
    , {EventEmitter} = require('events')
    , {lpad, random} = require('./common')
    ;
/**
 * @alias module:zmqbus/lib/election
 * @param {Object} [options={}]
 * @param {Object} [metadata={}]
 * @fires module:zmqbus/lib/election/error
 * @fires module:zmqbus/lib/election/ready
 * @fires module:zmqbus/lib/election/elected
 */
class Elector extends EventEmitter{
    constructor(options = {}, metadata = {}){
        this.options              = Object.assign( {}, options );
        this.medadata             = Object.assign( {}, metadata );
        this.sock                 = dgram.createSocket({type:'udp4', reuseAddr: true});
        this.id                   = random();
        this.metadata.id          = this.id;
        this.elect_last           = {id: ''};
        this.election_in_progress = false;
        this.elect_state          = 0;
        this.last_hb_time         = 0;

        /**
         * Error events emitted from the dgram socket
         * @name module:zmqbus/lib/election#error
         * @event
         * @param {TYPE} name description
         **/    
         this.sock.on('error', (err)=>{
            this.emit( 'error', err );
        });

        this.sock.on('message', (msg, rinfo) =>{
            try{
                this.process_msg(JSON.parse(msg.toString()), rinfo);
            } catch(e){
                // ignore malformed JSON
                return;
            }
        });

        this.sock.bind(this.options.multicast_port, ()=>{
            this.sock.setBroadcast(true);
            
            if( this.options.multicast_addr != '255.255.255.255' ){
                this.sock.addMembership( this.options.multicast_addr );
            }
            /**
             * Emitted when the dgram socket is ready
             * @name module:zmqbus/lib/election#ready
             * @event
             * @param {TYPE} name description
             **/    
            this.emit('ready', this, this.sock.address());
        });
    }

    /**
     * Sends connection information over multicast
     * @protected
     * @method module:zmqbus/lib/election#broadcast
     * @param {Array} advert connection information object
     **/
    broadcast(advert){
        if( !this.sock ){ return; }

        let msg = new Buffer(JSON.stringify(advert));
        this.sock.send(msg, 0, msg.length, this.options.multicast_port, this.options.multicast_addr);
    }

    /**
     * Responsible for parsing internal election messages 
     * @private
     * @method module:zmqbus/lib/election#process_msg
     * @param {msg} the incoming message to parse
     * @param {Object} netinfo Netork information relayed from the multicast router via libuv
     **/
    process_msg(msg, rinfo){

        if( !Array.isArray(msg) || msg.length < 2){ return; }

        switch( msg[0] ){
            case 'hb':
                if( this.elect_last.id == msg[1] ){
                    this.last_hb_time = new Date().getTime();
                }
                break;

            case 'elect':
                return this.on_elect_msg( msg.slice(1) );
        }
        /**
         * @name module:zmqbus/lib/election#event
         * @event
         * @param {TYPE} name description
         **/    
        this.emit('message', msg, rinfo);
    }

    /**
     * Handler for elect events and deciding a winner of the election process
     * @private
     * @method module:zmqbus/lib/election#on_elect_msg
     * @param {Array} msg The incoming message
     **/
    on_elect_msg(msg){
        if( msg[0] == 'start' ){
            // broadcast self as candidate
            this.election_in_progress = true;
            this.broadcast( ['elect', 'candidate', this.metadata, this.elect_last] );
        } else if( msg[0] == 'candidate' && this.elector ){
            if( msg[1].id < this.elect_candidate.id ){
                this.elect_candidate = msg[1];
            }

            if( !this.elect_last.id ) {
                this.elect_last = msg[2];
            }

            if( msg[1].id == this.elect_last.id ){
                this.elect_last_seen = true;
            }
        } else if( msg[0] == 'winner' ){
            this.elect_last = msg[1];
            this.election_in_progress = false;

            if(this.elect_last.id == this.id){
                clearInterval(this.hb_handle);
                // this node got elected
                this.hb_handle = setInterval(()=>{
                    this.broadcast( ['hb', this.id] );
                }, this.options.heartbeat_period);
            }
            /**
             * @name module:zmqbus/lib/election#event
             * @event
             * @param {TYPE} name description
             **/    
            this.emit('elected', this.elect_last);
        } else if( msg[0] == 'same' ){
            this.election_in_progress = false;
        }
    }

    /**
     * Starts the current node and participates in the peer ring and kicks off the election process
     * @method module:zmqbus/lib/election#start
     **/
    start(){
        this.checkHeartbeat();
        this.checkHeartbeatHandle = setInterval(this.checkHeartbeat.bind( this ), this.options.heartbeat_period);
    }

    /**
     * Determines if the current master has failed and starts a new election
     * @protected
     * @method module:zmqbus/lib/election#checkHeartbeat
     **/
    checkHeartbeat(){
        let delta = new Date().getTime() - this.last_hb_time;
        if (delta >= this.options.heartbeat_timeout){
            // haven't heard from the elected, force an election
            this.start_election();
        }
    }

    /**
     * closes any open sockets and removes node from peer participation
     * @method module:zmqbus/lib/election#stop
     **/
    stop(){
        clearInterval(this.checkHeartbeatHandle);
        this.checkHeartbeatHandle = null;
        this.sock.close();
        this.sock = null;
    }

    /**
     * Internal method used to start the election process
     * @protected
     * @method module:zmqbus/lib/election#start_election
     **/
    start_election(){
        if( this.election_in_progress ){ return; }

        this.broadcast(['elect', 'start']);
        this.elector = true;
        this.elect_candidate = this.metadata;
        this.elect_last_seen = false;

        setTimeout(() =>{
            if( this.elect_last.id != this.elect_candidate.id && !this.elect_last_seen ){
                this.broadcast( ['elect', 'winner', this.elect_candidate] );
                this.elect_last = this.elect_candidate;
            } else {
                this.broadcast( ['elect', 'winner', this.elect_last] );
            }
            this.elector = false;
        }, this.options.election_timeout );
    }
}

module.exports = Elector;
