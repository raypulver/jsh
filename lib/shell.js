var child_process = require('child_process'),
    inherits = require('util').inherits,
    fs = require('fs'),
    path = require('path'),
    emitter = require('events').EventEmitter;

var history = require('./history')(process.env.JSH_HISTORY || '.jsh_history');

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
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  self.aliases = aliases;
  self.history = history;
  self.runInternal = runInternal;
  process.stdin.on('data', function (key) {
    if (key === '\r' || key === '\n') {
      execBuffer();
    }
    else if (key === '\u001b[A') up();
    else if (key === '\u001b[B') down();
    else if (key === '\u0003') {
      write('\n');
      nextLine();
    }
    else if (key === '\b' || key === '\x7f') backspace();
    else {
      buffer += key;
      write(key);
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
  process.stdout.write(PS1);
}
function backspace () {
  buffer = buffer.substr(0, buffer.length - 1);
  deleteLine();
  process.stdout.write(buffer);
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
  write(buffer);
}
function down () {
  deleteLine();
  buffer = history.next();
  write(buffer);
}
function execBuffer(aliased) {
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
