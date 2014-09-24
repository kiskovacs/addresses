
// var stream = require('../index');

'use strict';

module.exports.tests = {};

module.exports.tests.interface = function(test, common) {
  test('factory', function(t) {
  // t.equal(typeof stream, 'function', 'stream factory');
    t.end();
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('index: ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    if( module.exports.tests.hasOwnProperty( testCase ) ){
      module.exports.tests[testCase](test, common);
    }
  }
};
