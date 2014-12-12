var child_process = require('child_process'),
    inherits = require('util').inherits,
    fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    emitter = require('events').EventEmitter;

var history = require('./history')(process.env.JSH_HISTORY || '.jsh_history'),
    input = require('./input')(),
    complete = require('./completion'),
    times = require('./util/string-multiply');

var sandbox = {
  assert: require('assert'),
  buffer: require('buffer'),
  child_process: require('child_process'),
  cluster: require('cluster'),
  crypto: require('crypto'),
  dgram: require('dgram'),
  domain: require('domain'),
  dns: require('dns'),
  events: require('events'),
  fs: require('fs'),
  http: require('http'),
  https: require('https'),
  net: require('net'),
  os: require('os'),
  path: require('path'),
  punycode: require('punycode'),
  querystring: require('querystring'),
  readline: require('readline'),
  stream: require('stream'),
  string_decoder: require('string_decoder'),
  tls: require('tls'),
  tty: require('tty'),
  url: require('url'),
  util: require('util'),
  vm: require('vm'),
  zlib: require('zlib')
};
Object.keys(global).forEach(function (v) {
  sandbox[v] = global[v];
});

var PS1,
    buffer = '',
    cursor = 0,
    context = vm.createContext(sandbox);

(function loadBuiltInCmds (commands) {
  var commandPath = path.join(__dirname, 'commands'),
      fileRe = /(.*)\.js$/;
  fs.readdirSync(commandPath).forEach(function (v) {
    var parts;
    parts = fileRe.exec(v);
    if (parts) {
      var fn = parts[1];
      commands[fn] = require(path.join(commandPath, fn));
    }
  });
})(context);

var aliases = context.alias.aliases;

(function createJshRC () {
  var rcPath = path.join(process.env.HOME, '.jshrc');
  if (!fs.existsSync(rcPath)) fs.writeFileSync(rcPath, fs.readFileSync(path.join(__dirname, 'jshrc-template.js')));
})();
  
vm.runInContext(fs.readFileSync(path.join(process.env.HOME, '.jshrc')), context);

PS1 = context.prompt || function () { return 'jsh>> '; };

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
        printPossibles(completed[1]);
      }
      buffer = completed[0];
      write(PS1() + buffer);
      cursor = buffer.length;
    } 
    else {
      buffer = buffer.substr(0, cursor) + ch + buffer.substr(cursor);
      cursor++;
      deleteLine();
      write(PS1() + buffer + times('\u001b[D', buffer.length - cursor));
    }
  });
  nextLine();
  resetTitle();
}
function nextLine() {
  buffer = '';
  cursor = 0;
  write(PS1());
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
    write(PS1() + buffer);
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
  write(PS1() + buffer);
}
function down () {
  deleteLine();
  buffer = history.next();
  cursor = buffer.length;
  write(PS1() + buffer);
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
  var commands = Object.keys(context),
      currentCmd, args, re;
  for (var i = 0; i < commands.length; i++) {
    re = RegExp('^' + commands[i] + '(.*)$');
    if (re.test(cmd)) {
      currentCmd = commands[i];
      var argStr = cmd.match(re)[1];
      if (argStr) args = argStr.split(' ').slice(1).map(trim);
      break;
    }
  }
  function trim (v) { return v.trim(); }
  if (currentCmd) {
    context[currentCmd].apply(this, args);
    return true;
  } else return false;
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
