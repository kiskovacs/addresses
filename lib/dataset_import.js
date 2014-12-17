/**
 * @file Functions that import raw address datasets, and hook them into the
 *      addresses pipeline.
 */

'use strict';

var CombinedStream = require('combined-stream'),
    logger = require("./logger"),
    debug = require("./debug_stream"),

    requireDir = require('require-dir'),

    through = require('through2'),

    propStream = require('prop-stream'),
    peliasSchema = require('pelias-schema'),
    peliasSuggester = require('pelias-suggester-pipeline'),

    peliasDbclient = require('pelias-dbclient')(),

    addresses = requireDir('./addresses'),
    deduplicateStream = require('./deduplicate_stream'),
    intervalLogger = require("./interval_logger");

var datasetOrder = new Array(addresses.length);
for (var property in addresses) {
  if (addresses.hasOwnProperty(property)) {
    datasetOrder[addresses[property].order] = property;
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
      logger.info('Processing set:' + setName);
      addressStreams[setName] = CombinedStream.create();

      var addressStream = addresses[ setName].addressStream(
          datasets[setName],
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
      //id: address.guid,
      id: numAddresses++,
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
      alpha3: "CZ",
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
  }, 1e4  );

  var geonameProps = Object.keys(peliasSchema.mappings.geoname.properties);
  var allowedProperties = geonameProps.concat( [ 'id', 'type' ] );

  var entryPoint = peliasSuggesterMapper;
  entryPoint
      .pipe( peliasSuggester.pipeline)
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
