var vm = require('vm'),
    expect = require('chai').expect;

var sandbox = {
  chickenpox: 'woopdoop',
  ricecake: 'doopwoop',
  a: 5,
  terraform: {
    'b}': 5,
  },
  PATH: process.env.PATH,
  HOME: process.env.HOME
}, context = vm.createContext(sandbox);

F.prototype = {
  giraffe: 'woop',
  hungary: 'woop'
}
function F () {
  this.golf = 'woop';
  this.hotel = 'woop';
}

var toCamelCase = require('../lib/util/to-camel-case'),
    substituteVars = require('../lib/util/substitute-vars'),
    substituteVarsWithContext = require('../lib/util/substitute-vars-with-context')(context),
    addNewlines = require('../lib/util/add-newlines'),
    escapeSpaces = require('../lib/util/escape-spaces'),
    breakUpCommand = require('../lib/util/break-up-command'),
    unescapeAndQuote = require('../lib/util/unescape-and-quote'),
    inJavaScript = require('../lib/util/in-javascript'),
    extractJs = require('../lib/util/extract-js'),
    extractPureJs = require('../lib/util/extract-pure-js'),
    firstWord = require('../lib/util/first-word'),
    substituteTilde = require('../lib/util/substitute-tilde')(context);
    allKeysStartingWith = require('../lib/util/all-keys-starting-with');

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
  it('should substitute the tilde character', function () {
    expect(substituteTilde('~/zshstuff')).to.equal(context.HOME + '/zshstuff');
  });
  it('should substitute expressions', function () {
    expect(substituteVars('execSync(\'rm ${HOME + \\\'woop\\\'}\');')).to.equal('execSync(\'rm \' + HOME + \'woop\' + \'\');');
  });
  it('should escape spaces', function () {
    expect(escapeSpaces('vim file')).to.equal('vim\\ file');
  });
  it('should break up a command into parts', function () {
    var broken = breakUpCommand('mv /home/sal/Multiple\\ Words /home/sal/Other\\ Words');
    expect(broken.last).to.equal('Other Words');
    expect(broken.lastPath).to.equal('/home/sal/');
    expect(broken.rest).to.equal('mv /home/sal/Multiple Words ');
    broken = breakUpCommand('mv');
    expect(broken.last).to.equal('mv');
    expect(broken.lastPath).to.equal('');
    expect(broken.rest).to.equal('');
  });
  it('should substitute variables in a command', function () {
    expect(substituteVarsWithContext('mv $chickenpox ${ricecake}')).to.equal('mv woopdoop doopwoop');
  });
  it('should leave unfinished variables uneval\'d', function () {
    expect(substituteVarsWithContext('mv ${terraform["b}"]} $a')).to.equal('mv 5 $a');
    expect(substituteVarsWithContext('mv ${terraform')).to.equal('mv ${terraform');
  });
  it('should know when the current line is in JavaScript', function () {
    expect(inJavaScript('mv ${boo')).to.equal(true);
  });
  it('should know when the current line is in a shell command', function () {
    expect(inJavaScript('mv foo')).to.equal(false);
  });
});
describe('unescape and quoting module', function () {
  it('should unescape and quote commands', function () {
    expect(unescapeAndQuote('mv Multiple\\ Words Somewhere\\ Else')).to.equal('mv "Multiple Words" "Somewhere Else"');
  });
  it('should leave quoted parts alone', function () {
    expect(unescapeAndQuote('mv "Multiple Words" Somewhere\\ Else')).to.equal('mv "Multiple Words" "Somewhere Else"');
  });
  it('should handle escapes', function () {
    expect(unescapeAndQuote('mv "Multiple\\ Words" Somewhere\\ Else')).to.equal('mv "Multiple Words" "Somewhere Else"');
  });
});
describe('js extraction module', function () {
  it('should extract the first word', function () {
    expect(firstWord('   four score and seven years ago')).to.equal('four');
  });
  it('should extract js into parts', function () {
    var extracted = extractJs('mv ${fs.');
    expect(extracted.lastPath).to.equal('fs');
    expect(extracted.last).to.equal('');
    expect(extracted.rest).to.equal('mv ${');
  });
  it('should extract pure js into parts', function () {
    var extracted = extractPureJs('fs.readdirSync');
    expect(extracted.lastPath).to.equal('fs');
    expect(extracted.last).to.equal('readdirSync');
    expect(extracted.rest).to.equal('');
  });
  it('should retrieve all keys in the prototype chain starting with a letter', function () {
    var f = new F(),
        keys = allKeysStartingWith(f, 'g');
    expect(keys.length).to.equal(3);
    expect(keys[0].length).to.equal(1);
    expect(keys[1].length).to.equal(1);
    expect(keys[2].length).to.equal(0);
    expect(keys[0][0]).to.equal('golf');
    expect(keys[1][0]).to.equal('giraffe');
  });
});
