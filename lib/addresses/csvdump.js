/**
 * @file Exports a stream from CSV dump.
 */

'use strict';

var through = require( 'through2' );
var csvStream = require( 'csv-stream' );
var Address = require( '../address' );
var fs = require('fs');
/**
 * Filter data sets filenames
 */
var fileNameFilter = function(filePath){
  return /\.csv$/.test(filePath);
}

/**
 * Create read stream
 * @param fileName file name
 */
var createReadStream = function(fileName){
  return fs.createReadStream(
      fileName,
      {start: 25} // skip the first line
  );
}

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

/**
 * Filter and normalize record stream.
 *
 * @param {readable stream} input Raw OpenAddresses records, as read from one
 *      of the dataset's CSVs.
 * @return {readable stream} Filtered records, now normalized into Address
 *      objects.
 */
function addressStream( inputStream ){
  return inputStream
    .pipe( csvStream.createStream({
      delimiter: '|'
    }))
    .pipe( filter )
    .pipe( normalizer );
}

module.exports = {
  order:3,
  fileNameFilter: fileNameFilter,
  createReadStream: createReadStream,
  filter: filter,
  normalizer: normalizer,
  addressStream: addressStream
};
