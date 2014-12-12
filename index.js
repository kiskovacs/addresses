/**
 * The main entry point for the Pelias adresses import. Designed to be run as a
 * command-line utility: `node index.js --help`.
 */

'use strict';

var logger = require( 'winston' );
var minimist = require( 'minimist' );
var datasetImport = require( './lib/dataset_import' );

/**
 * Configure the import script's logging framework.
 * @param {string|null} logFile The path of the file to write all logging
 *      statements to. If `null`, default to "import.log".
 */
function configureLogging( logFile ){
  logger.remove( logger.transports.Console );
  var loggerOptions = {
    filename: logFile || 'import.log',
    timestamp: true,
    colorize: true,
    handleExceptions: true
  };
  logger.add( logger.transports.File, loggerOptions );
  logger.info( 'Logger loaded.' );
}

/**
 * Respond to user command-line arguments.
 *
 * @param {array of string} rawArgs Just `process.argv.splice( 2 )` ( ie, all
 *      command-line arguments in an array).
 */
function handleUserArgs( rawArgs ){
  var helpMessage = [
    'A tool for importing, normalizing, and cross-interpolating addresses',
    'from numerous data sets. Use:',
    '\n\tnode index.js [ --help |' +
    ' --source SOURCE [ ... ] [ --log-file LOG_FILE ] ]\n',
    '--help: print this message and exit.',
    '--source SOURCE: import all files belonging to a supported dataset',
    '\tfrom the argument directory (eg `--tiger tiger_shapefiles/`).',
    '\tCurrently supported flags are: ' + datasetImport.datasetOrder.join(','),
    '--log-file LOG_FILE: The path of the file to write all logging',
    '\tstatements to. Defaults to "import.log".'
  ].join('\n');

  if( rawArgs.length === 0 ){
    console.error( helpMessage );
    process.exit( 1 );
  }
  var args = minimist( rawArgs );
  if( args.hasOwnProperty( 'help' ) ){
    console.log( helpMessage );
    return;
  }
  else {
    Error.stackTraceLimit = Infinity;
    configureLogging( args[ 'log-file' ] );
    datasetImport.importDatasets( args );
  }
}

handleUserArgs( process.argv.slice( 2 ) );
