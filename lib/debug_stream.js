'use strict';

var through = require('through2'),
    logger  = require('./logger');

/**
 * Debug filter.
 */
var debugFilter = through.obj( function write( obj, enc, next ){
    logger.debug(JSON.stringify(obj, undefined, 2));
    this.push(obj);
    next();
});

module.exports = debugFilter;