/**
 * @file Exports a stream from CSV dump.
 */

'use strict';

var through   = require('through2'),
    fs        = require('fs'),
    split     = require('split2'),
    debug     = require('../debug_stream'),
    logger    = require("../logger"),
    parent    = require('../input_plugin'),
    Address   = require( '../address' );



/**
 * Filter records.
 */
var filter = through.obj( function write( obj, enc, next ){
  if( obj.lon !== '' && obj.lat !== '' ){
    this.push( obj );
  }
  next();
});

/**
 * Interpolate and normalize records.
 */
var normalizer = through.obj( function write( obj, enc, next ){
  this.push( new Address(
    obj.name,
    obj.number,
    obj.street,
    obj.locality,
    obj.region,
    obj.postal_code,
    obj.country,
    parseFloat(obj.lat),
    parseFloat(obj.lon)
  ));
  next();
});

var columns = ['name', 'number', 'street', 'locality', 'region', 'postal_code', 'country', 'lat', 'lon'];

/**
 * Filter and normalize record stream.
 *
 * @param {readable stream} input Raw OpenAddresses records, as read from one
 *      of the dataset's CSVs.
 * @return {readable stream} Filtered records, now normalized into Address
 *      objects.
 */
function addressStream(dirPath, inputStream) {
  var dirStream = parent.createFileAddressStreams(dirPath, inputStream, /\.csv$/, function (fileName) {
    return fs.createReadStream( fileName, {
          // start: 25, // skip the first line
          flags: 'r',
          encoding: 'utf-8'
        }
    );
  });
  return dirStream
      .pipe(split(function(line){
          var obj={},
              field = line.split('|');
          for(var i=0; i<columns.length; i++){
              obj[columns[i]] = field[i];
          }
          return obj;
      }, { encoding: 'utf8'}))
      .pipe(filter)
      .pipe(debug)
      .pipe(normalizer)
      ;
}

module.exports = {
  order:3,
  filter: filter,
  normalizer: normalizer,
  addressStream: addressStream
};
