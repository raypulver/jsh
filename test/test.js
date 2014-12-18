var expect = require('chai').expect;

var toCamelCase = require('../lib/util/to-camel-case');
describe('jsh utility modules', function () {
  it('should convert to camel-case', function () {
    expect(toCamelCase('camel-case')).to.equal('camelCase');
    expect(toCamelCase('words-and-more-words')).to.equal('wordsAndMoreWords');
  });
});
