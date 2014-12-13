var child_process = require('child_process'),
    inherits = require('util').inherits,
    fs = require('fs'),
    path = require('path'),
    emitter = require('events').EventEmitter;

var history = require('./history')(process.env.JSH_HISTORY || '.jsh_history'),
    input = require('./input')(),
    vm = require('./vm')(),
    complete = require('./completion'),
    times = require('./util/string-multiply');

var prompter, aliases = vm.context.cmds.alias.aliases,
    buffer = '',
    currentLine = '';
    multiLine = 0;
    cursor = 0;

(function createJshRC () {
  var rcPath = path.join(process.env.HOME, '.jshrc');
  if (!fs.existsSync(rcPath)) fs.writeFileSync(rcPath, fs.readFileSync(path.join(__dirname, 'jshrc-template.js')));
})();
  
vm.execScript(path.join(process.env.HOME, '.jshrc'));

prompter = vm.context.prompt || function () { return 'jsh>> '; };

inherits(Shell, emitter);

module.exports = Shell;

function Shell (config) {
  var self = this;
  if (!(self instanceof Shell)) return new Shell(config);
  emitter.call(self);
  self.aliases = aliases;
  self.history = history;
  input.on('keypress', function (ch, key) {
    if (key && (key.name === 'enter' || key.name === 'return')) {
      buffer += currentLine + '\n';
      history.write(currentLine);
      currentLine = '';
      multiLine = unclosedBrackets();
      if (multiLine === 0) execBuffer();
      else nextSegment();
    }
    else if (key && key.name === 'up') up();
    else if (key && key.name === 'down') down();
    else if (key && key.name === 'right') {
      if (cursor !== currentLine.length) {
        cursor++;
        write(key.sequence);
      }
    } else if (key && key.name === 'left') {
      if (cursor !== 0) {
        cursor--;
        write(key.sequence);
      }
    }
    else if (key && key.name === 'c' && key.ctrl) {
      write('\n');
      nextLine();
    }
    else if (key && key.name === 'backspace') backspace();
    else if (key && key.name === 'tab') {
      var completed = complete(currentLine);
      if (completed[1].directories.length + completed[1].files.length > 1) write('\n');
      else {
        deleteLine();
      }
      if (completed[1].directories.length + completed[1].files.length > 1) {
        printPossibles(completed[1]);
      }
      currentLine = completed[0];
      write(prompt() + currentLine);
      cursor = currentLine.length;
    } 
    else {
      currentLine = currentLine.substr(0, cursor) + ch + currentLine.substr(cursor);
      cursor++;
      deleteLine();
      write(prompt() + currentLine + times('\u001b[D', currentLine.length - cursor));
    }
  });
  nextLine();
  resetTitle();
}
function nextLine() {
  buffer = '';
  currentLine = '';
  cursor = 0;
  multiLine = 0;
  write(prompt());
  resume();
}
function nextSegment() {
  cursor = 0;
  write('\n');
  write(prompt());
}
function prompt () {
  if (multiLine !== 0) {
    return times('..', multiLine) + ' ';
  } else return prompter();
}
function unclosedBrackets () {
  var stripped = buffer.replace(/".*?"/, '').replace(/'.*?'/, '');
  var leftBrackets = 0,
      rightBrackets = 0,
      i = 0;
  while (buffer[i]) {
    if (buffer[i] === '{') leftBrackets++;
    if (buffer[i] === '}') rightBrackets++;
    i++;
  }
  return leftBrackets - rightBrackets;
}

function error (msg) { process.stderr.write(msg); }
function write (msg) { process.stdout.write(msg); }
function deleteLine () {
  var lines = Math.ceil((prompt().length + currentLine.length)/process.stdout.columns) - 1;
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  for (var i = 0; i < lines; i++) {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }
}
function backspace () {
  if (cursor !== 0) {
    currentLine = currentLine.substr(0, cursor - 1) + currentLine.substr(cursor);
    cursor--;
    deleteLine();
    write(prompt() + currentLine);
    write(times('\u001b[D', currentLine.length - cursor));
  }
}
function resume () {
  process.stdin.resume();
}
function pause () {
  process.stdin.pause();
}
function up () {
  if (history.atEnd())
    history.write(currentLine);
  deleteLine();
  currentLine = history.prev();
  cursor = currentLine.length;
  write(prompt() + currentLine);
}
function down () {
  deleteLine();
  currentLine = history.next();
  cursor = currentLine.length;
  write(prompt() + currentLine);
}
function execBuffer(aliased) {
  buffer = buffer.trim();
  if (!aliased) {
    write('\n');
  }
  pause();
  if (aliases[buffer]) {
    buffer = aliases[buffer];
    execBuffer(true);
  } else {
    vm.exec(buffer);
    nextLine();
  }
}

function resetTitle () {
  process.title = path.basename(process.argv[1]);
}
function printPossibles (possibles) {
  var cursor = 0,
      max,
      largest = Object.keys(possibles).reduce(function (r, v) {
        var arr = [];
        possibles[v].forEach(function (v) {
          arr.push(v.length);
        });
        var max = Math.max.apply(void 0, arr);
        return max > r ? max: r;
      }, 0),
      cols = Math.floor(process.stdout.columns/largest),
      width = process.stdout.columns/cols;
  while (possibles.directories[0]) {
    max = Math.max(width - possibles.directories[0].length, 2);
    if (max + possibles.directories[0].length + 1 + cursor > process.stdout.columns) {
      write('\n');
      cursor = 0;
    }
    write('\033[1;34m' + possibles.directories[0] + '\033[22;39m/' + times(' ', max));
    cursor += possibles.directories[0].length + max + 1;
    possibles.directories.splice(0, 1);
  }
  while (possibles.files[0]) {
    max = Math.max(width - possibles.files[0].length, 2);
    if (max + possibles.files[0].length + 1 + cursor > process.stdout.columns) {
      write('\n');
      cursor = 0;
    }
    write(possibles.files[0] + times(' ', max));
    cursor += possibles.files[0].length + max;
    possibles.files.splice(0, 1);
  }
  write('\n');
}
