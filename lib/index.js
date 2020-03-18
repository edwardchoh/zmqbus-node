/*jshint esnext: true, laxcomma: true, node: true, smarttabs: true */
'use strict';
const Node = require('./node');
module.exports = Node;
module.exports.createNode = function(options = {}){
  return new Node(options);
};
