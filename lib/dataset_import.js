/**
 * @file Functions that import raw address datasets, and hook them into the
 *      addresses pipeline.
 */

'use strict';

var CombinedStream = require( 'combined-stream' );
var fs = require( 'fs' );
var path = require( 'path' );
var logger = require( 'winston' );
var requireDir = require( 'require-dir' );

var through = require( 'through2' );

var propStream = require( 'prop-stream' );
var peliasSchema = require(  'pelias-schema'  );
var peliasSuggester = require( 'pelias-suggester-pipeline' );

var peliasDbclient = require( 'pelias-dbclient' )();

var addresses = requireDir( './addresses');
var deduplicateStream = require( './deduplicate_stream' );
var intervalLogger = require("./interval_logger");

var datasetOrder = new Array(addresses.length);
for (var property in addresses) {
  if (addresses.hasOwnProperty(property)) {
    datasetOrder[addresses[property].order] = property;
  }
}
/**
 * Execute an action on all files in a directory whose paths match a regular
 * expression.
 *
 * @param {string} dirPath The path of the directory to search.
 * @param {string} filenameFilter Function to match file names
 *      inside `dirPath` against.
 * @param {function} action A function taking a single argument, a string
 *      filepath, that'll be called once for every matching path.
 */
function createFileAddressStreams( dirPath, filenameFilter, action ){
  var files = fs.readdirSync( dirPath );
  for( var file = 0; file < files.length; file++ ){
    var filePath = path.join( dirPath, files[ file ] );
    if( ( fs.lstatSync( filePath ).isFile() &&
      filenameFilter( filePath ) ) ){
      action( filePath );
    }
  }
}

/**
 * Import datasets into the addresses pipeline.
 *
 * @param {object} datasets An object mapping the name of each dataset to
 *      import to the directory containins its files. See the `--source`
 *      command-line argument in `node index.js --help`.
 */
function importDatasets( datasets ){
  var addressStreams = {};
  var unifiedAddressStream = CombinedStream.create();

  for( var ind = 0; ind < datasetOrder.length; ind++ ){
    var setName = datasetOrder[ ind ];
    if( datasets.hasOwnProperty( setName ) ){

      addressStreams[setName] = CombinedStream.create();
      createFileAddressStreams(
          datasets[setName],
          addresses[ setName].fileNameFilter,
          function ( filename ){
            var fileStream = addresses[ setName ].createReadStream( filename );
            fileStream.on( 'end', function (){
              logger.info( 'Finished loading: ' + filename );
            });
            addressStreams[setName].append( fileStream );
          }
      );

      var addressStream = addresses[ setName ].addressStream(
        addressStreams[ setName ]
      );
      addressStream.on(
        'end',
        logger.info.bind( null, 'Finished importing: ' + setName )
      );
      unifiedAddressStream.append( addressStream );
    }
  }

  unifiedAddressStream.on( 'end', function (  ){
    intervalLogger.stopIntervalLogging();
  });
  unifiedAddressStream.pipe(createImportPipeline());
}

/**
 * Create a pipeline to pipe Address objects into. Adds the deduplicator,
 * suggester, and other necessary components.
 *
 * @return {Writable stream} The entry point of the pipeline.
 */
function createImportPipeline(){
  var numAddresses = 0;
  var peliasSuggesterMapper = through.obj(function write(address, enc, next){
    numAddresses++;
    var record = {
      id: address.guid,
      // id: numAddresses++,
      _meta: {
        type: "geoname"
      },
      name: {
        default: [
          address.house_name || "", address.house_number, address.street
        ].join(" ").trim()
      },
      admin0: address.country,
      admin1: address.region,
      admin2: address.locality,
      alpha3: "GBR",
      center_point: {
        lat: address.latitude,
        lon: address.longitude
      }
    };
    this.push(record);
    next();
  });

  var peliasDbclientMapper = through.obj(function write(item, enc, next){
    var id = item.id;
    delete item.id;

    this.push({
      _index: "pelias",
      _type: "geoname",
      _id: id,
      data: item
    });

    next();
  });

  intervalLogger.startIntervalLogging( function logIntervalNumImported(){
    logger.info( 'Number of addresses imported: %d', numAddresses );
  }, 1e4  )

  var geonameProps = Object.keys(peliasSchema.mappings.geoname.properties);
  var allowedProperties = geonameProps.concat( [ 'id', 'type' ] );

  var entryPoint = deduplicateStream();
  entryPoint
    .pipe( peliasSuggesterMapper )
    .pipe( peliasSuggester.pipeline )
    .pipe( propStream.whitelist( allowedProperties ) )
    .pipe( peliasDbclientMapper )
    .pipe( peliasDbclient );
  return entryPoint;
}

module.exports = {
  datasetOrder: datasetOrder,
  importDatasets: importDatasets,
  createImportPipeline: createImportPipeline
};
