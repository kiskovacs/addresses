# mapzen addresses pipeline

A pipeline for collating, normalizing, de-duplicating, and interpolating address data from a number of different
sources, like TIGER and OpenStreetMap.

## Install Dependencies

```bash
$ npm install
```

## Contributing

Please fork and pull request against upstream master on a feature branch. Pretty please: provide unit tests and script
fixtures in the `test` directory.

### Running Unit Tests

```bash
$ npm test
```

### Continuous Integration

Travis tests every release against node version `0.10`

[![Build Status](https://travis-ci.org/pelias/addresses.png?branch=master)](https://travis-ci.org/pelias/addresses)
