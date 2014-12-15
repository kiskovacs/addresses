/**
 * @file Exports a filtered and normalized OpenAddresses Address stream.
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
 * Filter OpenAddresses records.
 */
var filter = through.obj( function write( obj, enc, next ){
  if( obj.lon !== '' && obj.lat !== '' &&
    obj.number !== '' && obj.street !== '' ){
    this.push( obj );
  }
  next();
});

/**
 * Interpolate and normalize OpenAddresses records.
 */
var normalizer = through.obj( function write( obj, enc, next ){
  this.push( new Address(
    null,
    obj.number,
    obj.street,
    null,
    null,
    null,
    null,
    parseFloat(obj.lat),
    parseFloat(obj.lon)
  ));
  next();
});

/**
 * Filter and normalize an OpenAddresses record stream.
 *
 * @param {readable stream} input Raw OpenAddresses records, as read from one
 *      of the dataset's CSVs.
 * @return {readable stream} Filtered records, now normalized into Address
 *      objects.
 */
function addressStream( inputStream ){
  return inputStream
    .pipe( csvStream.createStream( {
      columns: [ 'lon', 'lat', 'number', 'street' ]
    }))
    .pipe( filter )
    .pipe( normalizer );
}

module.exports = {
  order:0,
  fileNameFilter: fileNameFilter,
  createReadStream: createReadStream,
  filter: filter,
  normalizer: normalizer,
  addressStream: addressStream
};
