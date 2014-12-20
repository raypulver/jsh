var waitfor = require('./waitfor'),
    child_process = require('child_process'),
    path = require('path'),
    fs = require('fs'),
    vm = require('vm'),
    inspect = require('./util/inspect'),
    addNewlines = require('./util/add-newlines'),
    removeParens = require('./util/remove-parens'),
    substituteVars = require('./util/substitute-vars'),
    toCamelCase = require('./util/to-camel-case');

var jshrequire = require('./functions/require');

VM.prototype = {
  exec: function (cmd, silent) {
    var realCmd = this.sandr(addNewlines(cmd));
    if (this.debug) console.log(realCmd);
    var ret = vm.runInContext(realCmd, this.context);
    if (typeof ret !== 'undefined' && !silent) console.log(inspect(ret));
  },
  execScript: function (path) {
    this.exec(fs.readFileSync(path, 'utf8'), true);
  }
};

module.exports = VM;

function VM (debug) {
  if (!(this instanceof VM)) return new VM(debug);

  var cmds = {},
      context = {},
      preload = ['assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain', 'events', 'freelist', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'];

  (function loadModules (modules, ctx) {
    modules.forEach(function (v) {
      this[v] = require(v);
    }, ctx);
    ctx.require = jshrequire;
    ctx.execSync = execSync;
    ctx.cmds = cmds;
    Object.keys(global).forEach(function (v) {
      this[v] = global[v];
    }, ctx);
  })(preload, context);

  (function loadEnv (ctx) {
    Object.keys(process.env).forEach(function (v) {
      if (!/[a-z]/.test(v)) this[v] = process.env[v];
    }, ctx);
  })(context);
  
  (function loadUsersModules (ctx) {
    var modPath = path.join(context.HOME, '.jsh', 'node_modules');
    if (fs.existsSync(modPath)) {
      fs.readdirSync(modPath).forEach(function (v) {
        try {
          this[toCamelCase(v)] = require(path.join(modPath, v));
        } catch (e) {}
      }, ctx);
    }
  })(context);

  context = vm.createContext(context);

  (function loadBuiltInCmds (commands) {
    var commandPath = path.join(__dirname, 'commands'),
        fileRe = /(.*)\.js$/;
    fs.readdirSync(commandPath).forEach(function (v) {
      var parts;
      parts = fileRe.exec(v);
      if (parts) {
        var fn = parts[1];
        this[fn] = require(path.join(commandPath, fn));
      }
    }, commands);
  })(cmds);

  this.debug = debug;
  this.context = context;
  this.sandr = sandr;

  function executableExists (exe) {
    if (/^(\.)?(\.)?\//.test(exe)) {
      return fs.existsSync(path.resolve(exe));
    }
    return context.PATH.split(':').reduce(function (r, v) {
      if (r) return true;
      return fs.existsSync(path.join(v, exe));
    }, false);
  }
  function sandr (cmd) {
    var parts = cmd.split('\n');
    parts = parts.map(function (v) {
      if (/^\s*\S+/.test(v)) {
        var builtIn = convertBuiltIn(v);
        if (builtIn) return builtIn;
        else if (executableExists(removeParens(v.match(/^\s*(\S+)/)[1]))) return substituteTilde(substituteVars(v.replace(/'/g, '\\\'').replace(/^\s*(.*?);?$/g, 'execSync(\'$1\');')));
        return v;
      }
      return v;
    });
    return parts.join('\n');
  }
  function convertBuiltIn(cmd) {
    var commands = Object.keys(cmds);
    cmd = cmd.trim();
    var split = cmd.split(/\s+/);
    var last = split[split.length - 1],
        arg;
    if (last[last.length - 1] === ';') split[split.length - 1] = last.substr(0, last.length - 1);
    if (commands.reduce(function (r, v) {
      if (r) return r;
      else if (v === split[0]) return true;
      else return false;
    }, false)) {
      cmd = 'cmds.' + split.splice(0, 1);
      arg = split.join(' ');
      cmd += '(\'' + arg.replace(/'/g, '\\\'') + '\');';
      return substituteTilde(substituteVars(cmd));
    } else return false;
  }
  function substituteTilde (cmd) {
    var i = 0, escapeNext = false;
    while (cmd[i]) {
      if (escapeNext) {
        escapeNext = false;
        i++;
        continue;
      }
      if (cmd[i] === '\\') {
        escapeNext = true;
        i++;
        continue;
      }
      if (cmd[i] === '~') {
        cmd = cmd.substr(0, i) + context.HOME + cmd.substr(i + 1);
        i += context.HOME.length;
        continue;
      }
      i++;
    }
    return cmd;
  }
  function execSync (cmd) {
    var inherit = { stdio: 'inherit', env: context },
        args = cmd.split(/\s+/),
        subprocess;
    cmd = args.splice(0, 1)[0];
    if (cmd && executableExists(cmd.match(/\(?(.*?)\)?/)[1])) {
      process.title = path.basename(cmd);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      subprocess = child_process.spawn('sh', ['-c', cmd + (args.length > 0 ? ' ': '') + args.join(' ') ], inherit);
      waitfor(subprocess.pid);
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      subprocess.unref();
      process.title = path.basename(process.argv[1]);
    }
  }
}
