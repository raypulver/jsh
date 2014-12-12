var child_process = require('child_process'),
    inherits = require('util').inherits,
    fs = require('fs'),
    path = require('path'),
    emitter = require('events').EventEmitter;

var history = require('./history')(process.env.JSH_HISTORY || '.jsh_history'),
    input = require('./input')(),
    complete = require('./completion'),
    times = require('./util/string-multiply');

var PS1 = 'jsh>> ',
    buffer = '',
    cursor = 0,
    cmds = {},
    aliases = {};

(function loadBuiltInCmds (commands) {
  var commandPath = path.join(__dirname, 'commands'),
      fileRe = /(.*)\.js/;
  fs.readdirSync(commandPath).forEach(function (v) {
    var fn = v.match(fileRe)[1];
    commands[fn] = require(path.join(commandPath, fn));
  });
})(cmds);

inherits(Shell, emitter);

module.exports = Shell;

function Shell (config) {
  var self = this;
  if (!(self instanceof Shell)) return new Shell(config);
  emitter.call(self);
  self.aliases = aliases;
  self.history = history;
  self.runInternal = runInternal;
  input.on('keypress', function (ch, key) {
    if (key && (key.name === 'enter' || key.name === 'return')) {
      execBuffer();
    }
    else if (key && key.name === 'up') up();
    else if (key && key.name === 'down') down();
    else if (key && key.name === 'right') {
      if (cursor !== buffer.length) {
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
      cursor = 0;
      nextLine();
    }
    else if (key && key.name === 'backspace') backspace();
    else if (key && key.name === 'tab') {
      var completed = complete(buffer);
      if (completed[1].directories.length + completed[1].files.length > 1) write('\n');
      else {
        deleteLine();
      }
      if (completed[1].directories.length + completed[1].files.length > 1) {
        completed[1].directories.forEach(function (v) {
          write('\033[1;34m' + v + '\033[22;39m/' + '\n');
        });
        completed[1].files.forEach(function (v) {
          write(v + '\n');
        });
      }
      buffer = completed[0];
      write(PS1 + buffer);
      cursor = buffer.length;
    } 
    else {
      buffer = buffer.substr(0, cursor) + ch + buffer.substr(cursor);
      cursor++;
      deleteLine();
      write(PS1 + buffer + times('\u001b[D', buffer.length - cursor));
    }
  });
  nextLine();
  resetTitle();
}
function nextLine() {
  buffer = '';
  write(PS1);
  resume();
}
function error (msg) { process.stderr.write(msg); }
function write (msg) { process.stdout.write(msg); }
function deleteLine () {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
}
function backspace () {
  if (cursor !== 0) {
    buffer = buffer.substr(0, cursor - 1) + buffer.substr(cursor);
    cursor--;
    deleteLine();
    write(PS1 + buffer);
    write(times('\u001b[D', buffer.length - cursor));
  }
}
function spawn (cmd) {
  var inherit = { stdio: 'inherit', env: process.env },
      args = cmd.split(/\s+/);
  cmd = args.splice(0, 1)[0];
  if (cmd && executableExists(cmd)) {
    process.title = cmd;
    if (args.length > 0) return child_process.spawn(cmd, args, inherit);
    else return child_process.spawn(cmd, inherit);
  }
}
function executableExists (exe) {
  return process.env.PATH.split(':').reduce(function (r, v) {
    if (r) return true;
    return fs.existsSync(path.join(v, exe));
  }, false);
}
function resume () {
  process.stdin.resume();
}
function pause () {
  process.stdin.pause();
}
function up () {
  if (history.atEnd())
    history.write(buffer);
  deleteLine();
  buffer = history.prev();
  cursor = buffer.length;
  write(PS1 + buffer);
}
function down () {
  deleteLine();
  buffer = history.next();
  cursor = buffer.length;
  write(PS1 + buffer);
}
function execBuffer(aliased) {
  buffer = buffer.trim();
  if (!aliased) {
    history.write(buffer);
    write('\n');
  }
  pause();
  if (aliases[buffer]) {
    buffer = aliases[buffer];
    execBuffer(true);
  } else {
    if (runInternal(buffer)) {
      nextLine();
    } else {
      var subprocess = spawn(buffer);
      if (subprocess) {
        subprocess.on('exit', function () {
          resetTitle();
          nextLine();
        });
      } else {
        nextLine();
      }
    }
  }
}

function runInternal(cmd) {
  var commands = Object.keys(cmds),
      currentCmd, args, re;
  for (var i = 0; i < commands.length; i++) {
    re = RegExp('^' + commands[i] + '(.*)$');
    if (re.test(cmd)) {
      currentCmd = commands[i];
      var argStr = cmd.match(re)[1];
      if (argStr) args = argStr.split(' ').slice(1).map(function (v) { return v.trim() });
      break;
    }
  }
  if (currentCmd) {
    cmds[currentCmd].apply(this, args);
    return true;
  } else return false;
}

function resetTitle () {
  process.title = path.basename(process.argv[1]);
}
