var expect = require('chai').expect;

var toCamelCase = require('../lib/util/to-camel-case'),
    substituteVars = require('../lib/util/substitute-vars'),
    addNewlines = require('../lib/util/add-newlines');
describe('jsh utility modules', function () {
  it('should convert to camel-case', function () {
    expect(toCamelCase('camel-case')).to.equal('camelCase');
    expect(toCamelCase('words-and-more-words')).to.equal('wordsAndMoreWords');
  });
  it('should add newlines without altering content', function () {
    expect(addNewlines('var a = { a: 1}')).to.equal('var a = \n{\n a: 1\n}\n');
  });
  it('should add newlines after semicolons and preserve strings', function () {
    expect(addNewlines('console.log(\'{a:1}\');')).to.equal('console.log(\'{a:1}\');\n');
  });
  it('should substitute variables', function () {
    expect(substituteVars('execSync(\'rm $HOME\');')).to.equal('execSync(\'rm \' + HOME + \'\');');
  });
  it('should substitute expressions', function () {
    expect(substituteVars('execSync(\'rm ${HOME + \\\'woop\\\'}\');')).to.equal('execSync(\'rm \' + HOME + \'woop\' + \'\');');
  });
});
