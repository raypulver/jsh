var child_process = require('child_process'),
    inherits = require('util').inherits,
    fs = require('fs'),
    path = require('path'),
    emitter = require('events').EventEmitter;

var readline = require('./readline'),
    complete = require('./completion'),
    times = require('./util/string-multiply');

var prompter,
    buffer = '',
    multiLine = 0,
    debug = false,
    args = process.argv.slice(2);

(function parseArgs () {
  for (var i = 0; i < args.length; i++) {
    if (args[i] === '-d' || args[i] === '--debug')
      debug = true;
  }
})();

var vm = require('./vm')(debug);
var aliases = vm.context.cmds.alias.aliases;
var rl = readline.createInterface(process.stdin, process.stdout, complete, vm.context);

(function createJshRC () {
  var rcPath = path.join(process.env.HOME, '.jshrc');
  if (!fs.existsSync(rcPath)) fs.writeFileSync(rcPath, fs.readFileSync(path.join(__dirname, 'jshrc-template.js')));
})();
  
vm.execScript(path.join(vm.context.HOME, '.jshrc'));

prompter = vm.context.prompt || function () { return 'jsh>> '; };

inherits(Shell, emitter);

module.exports = Shell;

function Shell (config) {
  var self = this;
  if (!(self instanceof Shell)) return new Shell(config);
  emitter.call(self);
  self.aliases = aliases;
  rl.on('line', function (line) {
    buffer += line + '\n';
    multiLine = unclosedBrackets();
    if (multiLine === 0) execBuffer();
    else nextSegment();
  });
  nextLine();
  resetTitle();
}
function nextLine() {
  buffer = '';
  multiLine = 0;
  nextSegment();
  resume();
}
function nextSegment() {
  resetPrompt();
  rl.prompt();
}
function prompt () {
  if (multiLine !== 0) {
    return times('..', multiLine) + ' ';
  } else return prompter();
}
function resetPrompt() {
  rl.setPrompt(prompt());
}
function unclosedBrackets () {
  var leftBrackets = 0,
      rightBrackets = 0,
      i = 0,
      inString = '';
  while (buffer[i]) {
    if (inString) {
      if (buffer[i] === inString && buffer[i - 1] !== '\\') {
        inString = '';
        i++;
        continue;
      } else {
        i++;
        continue;
      }
    } else {
      if (buffer[i] === '"' || buffer[i] === '\'') {
        inString = buffer[i];
        i++;
        continue;
      }
      if (buffer[i] === '{') leftBrackets++;
      if (buffer[i] === '}') rightBrackets++;
      i++;
    }
  }
  return leftBrackets - rightBrackets;
}
function error (msg) { process.stderr.write(msg); }
function write (msg) { process.stdout.write(msg); }
function resume () {
  rl.resume();
}
function pause () {
  rl.pause();
}
function execBuffer(aliased) {
  var needsAliasing = false;
  buffer = buffer.trim();
  pause();
  if (!aliased) {
    Object.keys(aliases).forEach(function (v) {
      if (RegExp('^' + v).test(buffer))
        needsAliasing = true;
    });
  }
  if (needsAliasing) {
    Object.keys(aliases).forEach(function (v) {
      buffer = buffer.replace(RegExp(v, 'g'), aliases[v]);
    });
    execBuffer(true);
  } else {
    try { vm.exec(buffer); nextLine(); }
    catch (e) {
      if (e.message === 'Unexpected end of input') {
        buffer += currentLine;
        currentLine = '';
        multiLine++;
        process.stdout.moveCursor(0, -1);
        nextSegment();
        resume();
      } else {
        console.log(e.stack);
        nextLine();
      }
    }
  }
}

function resetTitle () {
  process.title = path.basename(process.argv[1]);
}
