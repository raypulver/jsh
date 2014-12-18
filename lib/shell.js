var child_process = require('child_process'),
    inherits = require('util').inherits,
    fs = require('fs'),
    path = require('path'),
    format = require('util').format,
    emitter = require('events').EventEmitter;

var readline = require('./readline'),
    complete = require('./completion'),
    times = require('./util/string-multiply');

var exeName = path.basename(process.argv[1]);

inherits(Shell, emitter);

module.exports = Shell;

function Shell (config) {
  var self = this;
  if (!(self instanceof Shell)) return new Shell(config);
  emitter.call(self);

  var prompter,
      debug = false,
      command,
      script;
      args = process.argv.slice(2);

  (function parseArgs () {
    for (var i = 0; i < args.length; i++) {
      if (args[i] === '-d' || args[i] === '--debug') {
        debug = true;
        args.splice(i, 1);
        i--;
      } else if (args[i] && args[i][0] !== '-') {
        if (!fs.existsSync(args[i])) {
          error(format('No such file: %s', args[i]));
          process.exit(1);
        } else if (fs.statSync(args[i]).isDirectory()) {
          error(format('%s is a diirectory', args[i]));
          process.exit(1);
        }
        var lines = fs.readFileSync(args[i], 'utf8').split('\n');
        if (lines[0].substr(0, 2) === '#!') lines.splice(0, 1);
        script = lines.join('\n');
        args.splice(i, 1);
        i--;
      } else if (args[i] === '-c') {
        args.splice(i, 1);
        command = args.splice(i, 1)[0];
        i -= 2;
      }
    }
  })();

  self.vm = require('./vm')(debug),
  self.aliases = self.vm.context.cmds.alias.aliases;
  self.multiLine = 0;
  self.buffer = '';
  self.nextLine = nextLine;
  
  (function createJshRC () {
    var rcPath = path.join(process.env.HOME, '.jshrc');
    if (!fs.existsSync(rcPath)) fs.writeFileSync(rcPath, fs.readFileSync(path.join(__dirname, 'jshrc-template.js')));
  })();
  
  self.vm.execScript(path.join(self.vm.context.HOME, '.jshrc'));
  prompter = self.vm.context.prompt || function () { return 'jsh>> '; };

  if (script) {
    self.vm.exec(script);
  } else if (command) {
    self.vm.exec(command);
  } else {
    self.readline = readline.createInterface(process.stdin, process.stdout, complete, self);
    self.readline.on('line', function (line) {
      self.buffer += line + '\n';
      self.multiLine = unclosedBrackets();
      if (self.multiLine === 0) {
        try {
          execBuffer();
        } catch (e) {
          if (e.message === 'Unexpected end of input') {
            self.multiLine++;
            nextSegment();
            resume();
          } else {
            console.log(e.stack);
            nextLine();
          }
        }
      } else nextSegment();
    });
    nextLine();
  }
  resetTitle();
  function nextLine() {
    self.buffer = '';
    self.multiLine = 0;
    nextSegment();
    resume();
  }
  function nextSegment() {
    resetPrompt();
    if (self.readline) self.readline.prompt();
  }
  function prompt () {
    if (self.multiLine !== 0) {
      return times('..', self.multiLine) + ' ';
    } else return prompter();
  }
  function resetPrompt() {
    if (self.readline) self.readline.setPrompt(prompt());
  }
  function unclosedBrackets () {
    var leftBrackets = 0,
        rightBrackets = 0,
        i = 0,
        inString = '';
    while (self.buffer[i]) {
      if (inString) {
        if (self.buffer[i] === inString && self.buffer[i - 1] !== '\\') {
          inString = '';
          i++;
          continue;
        } else {
          i++;
          continue;
        }
      } else {
        if (self.buffer[i] === '"' || self.buffer[i] === '\'') {
          inString = self.buffer[i];
          i++;
          continue;
        }
        if (self.buffer[i] === '{') leftBrackets++;
        if (self.buffer[i] === '}') rightBrackets++;
        i++;
      }
    }
    return leftBrackets - rightBrackets;
  }
  function resume () {
    if (self.readline) self.readline.resume();
  }
  function pause () {
    if (self.readline) self.readline.pause();
  }
  function execBuffer(aliased) {
    var needsAliasing = false;
    self.buffer = self.buffer.trim();
    pause();
    if (!aliased) {
      Object.keys(self.aliases).forEach(function (v) {
        if (RegExp('^' + v).test(self.buffer))
          needsAliasing = true;
      });
    }
    if (needsAliasing) {
      Object.keys(self.aliases).forEach(function (v) {
        self.buffer = self.buffer.replace(RegExp(v, 'g'), self.aliases[v]);
      });
      execBuffer(true);
    } else {
      self.vm.exec(self.buffer);
      nextLine();
    }
  }
}
function error (msg) { process.stderr.write(format('%s: \033[41mERR!\033[m %s\n', exeName, msg)); }
function write (msg) { process.stdout.write(msg); }
function resetTitle () {
  process.title = exeName;
}
