var waitfor = require('./waitfor'),
    child_process = require('child_process'),
    path = require('path'),
    fs = require('fs'),
    vm = require('vm'),
    inspect = require('./util/inspect'),
    addNewlines = require('./util/add-newlines'),
    removeParens = require('./util/remove-parens'),
    unescapeAndQuote = require('./util/unescape-and-quote'),
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

  (function loadBuiltInCmds (commands, ctx) {
    var commandPath = path.join(__dirname, 'commands'),
        fileRe = /(.*)\.js$/;
    fs.readdirSync(commandPath).forEach(function (v) {
      var parts;
      parts = fileRe.exec(v);
      if (parts) {
        var fn = parts[1];
        this[fn] = require(path.join(commandPath, fn))(ctx);
      }
    }, commands);
  })(cmds, context);
  
  var executableExists = require('./util/executable-exists')(context);

  this.debug = debug;
  this.context = context;
  this.sandr = require('./util/sandr')(context);

  function execSync (cmd) {
    var inherit = { stdio: 'inherit', env: context },
        args = cmd.split(/\s+/),
        subprocess;
    cmd = args.splice(0, 1)[0];
    if (cmd && executableExists(removeParens(cmd))) {
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
