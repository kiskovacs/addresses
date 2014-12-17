/**
 * @file Exports utility functions for input plugins
 */

"use strict";

var logger = require("./logger"),
    fs     = require("fs"),
    path = require('path');

/**
 * Execute an action on all files in a directory whose paths match a regular
 * expression.
 *
 * @param {string} dirPath The path of the directory to search.
 * @param {string} fileNameFilter Regex to match file names
 *      inside `dirPath` against.
 * @param {function} action A function taking a single argument, a string
 *      filepath, that'll be called once for every matching path.
 */
function createFileAddressStreams( dirPath, addressStreams, fileNameFilter, createReadStream){
  logger.info( 'Adding directory: ' + dirPath);
  var files = fs.readdirSync( dirPath );
  for( var file = 0; file < files.length; file++ ){
    var filePath = path.join( dirPath, files[ file ] );
    if( fs.lstatSync( filePath ).isFile() &&
        fileNameFilter.test( filePath ) ){
      logger.info( 'Found file: ' + filePath );
      var fileStream = createReadStream( filePath );
      fileStream.on( 'end', function (){
        logger.info( 'Finished loading: ' + filePath );
      });
      addressStreams.append( fileStream );
    }
  }
  return addressStreams;
}

module.exports = {
  createFileAddressStreams: createFileAddressStreams
}
