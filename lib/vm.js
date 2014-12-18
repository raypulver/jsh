var waitfor = require('./waitfor'),
    child_process = require('child_process'),
    path = require('path'),
    fs = require('fs'),
    vm = require('vm'),
    inspect = require('./util/inspect'),
    escapeSpaces = require('./util/escape-spaces'),
    toCamelCase = require('./util/to-camel-case');

var jshrequire = require('./functions/require');

var cmds = {},
    context = {},
    preload = ['assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain', 'events', 'freelist', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'];

(function loadModules (modules, ctx) {
  modules.forEach(function (v) {
    ctx[v] = require(v);
  });
  ctx.require = jshrequire;
  ctx.spawnSync = spawnSync;
  ctx.cmds = cmds;
  Object.keys(global).forEach(function (v) {
    ctx[v] = global[v];
  });
})(preload, context);

(function loadEnv (ctx) {
  Object.keys(process.env).forEach(function (v) {
    if (!/[a-z]/.test(v)) ctx[v] = process.env[v];
  });
})(context);

(function loadUsersModules (ctx) {
  var modPath = path.join(context.HOME, '.jsh', 'node_modules');
  if (fs.existsSync(modPath)) {
    fs.readdirSync(modPath).forEach(function (v) {
      try {
        ctx[toCamelCase(v)] = require(path.join(modPath, v));
      } catch (e) {}
    });
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
      commands[fn] = require(path.join(commandPath, fn));
    }
  });
})(cmds);

VM.prototype = {
  exec: function (cmd) {
    var realCmd = sandr(addNewlines(cmd));
    if (this.debug) console.log(realCmd);
    var ret = vm.runInContext(realCmd, this.context);
    if (typeof ret !== 'undefined') console.log(inspect(ret));
  },
  execScript: function (path) {
    this.exec(fs.readFileSync(path, 'utf8'));
  }
};
module.exports = VM;
function VM (debug) {
  if (!(this instanceof VM)) return new VM(debug);
  this.debug = debug;
  this.context = context;
}
function spawnSync (cmd) {
  var inherit = { stdio: 'inherit', env: context },
      args = cmd.split(/\s+/),
      subprocess;
  cmd = args.splice(0, 1)[0];
  if (cmd && executableExists(cmd)) {
    process.title = path.basename(cmd);
    process.stdin.setRawMode(false);
    subprocess = child_process.spawn('sh', ['-c', cmd + (args.length > 0 ? ' ': '') + args.join(' ') ], inherit);
    waitfor(subprocess.pid);
    process.stdin.setRawMode(true);
    subprocess.unref();
    process.title = path.basename(process.argv[1]);
  }
}
function executableExists (exe) {
  if (/^(\.)?(\.)?\//.test(exe)) {
    return fs.existsSync(path.resolve(exe));
  }
  return context.PATH.split(':').reduce(function (r, v) {
    if (r) return true;
    return fs.existsSync(path.join(v, exe));
  }, false);
}
function addNewlines(cmd) {
  var i = 0, addingNewLine = false, inConditional = false, inString = false, stringChar = '';
  while (cmd[i]) {
    if (!inString && (cmd[i] === '"' || cmd[i] === '\'') && cmd[i - 1] !== '\\') {
      inString = true;
      stringChar = cmd[i];
      i++;
      continue;
    } else if (inString) {
      if (cmd[i] === stringChar && cmd[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
      i++;
      continue;
    } else if (!inString && !inConditional && (cmd.substr(i, 2) === 'if' || cmd.substr(i, 3) === 'for' || cmd.substr(i, 5) === 'while')) {
      inConditional = true;
      addingNewLine = true;
      i++;
      continue;
    } else if (!inString && inConditional) {
      if (cmd[i] === ')') {
        inConditional = false;
        addingNewLine = false;
        cmd = cmd.substr(0, i + 1) + '\n' + cmd.substr(i + 1);
        i += 2;
        continue;
      } else {
        i++;
        continue;
      }
    } else if (!inString) {
      if (cmd[i] === '{') {
        cmd = cmd.substr(0, i - 1) + '\n' + '{' + '\n' + cmd.substr(i + 1);
        i += 3;
        continue;
      } else if (cmd[i] === '}') {
        cmd = cmd.substr(0, i - 1) + '\n' + '}' + '\n' + cmd.substr(i + 1);
        i += 3;
        continue;
      } else if (cmd[i] === ';') {
        cmd = cmd.substr(0, i + 1) + '\n' + cmd.substr(i + 1);
        i += 2;
        continue;
      } else {
        i++;
        continue;
      }
    }
  }
  return cmd;
}
function sandr (cmd) {
  var parts = cmd.split('\n');
  parts = parts.map(function (v) {
    if (/^\s*\S+/.test(v)) {
      var builtIn = convertBuiltIn(v);
      if (builtIn) return builtIn;
      else if (executableExists(v.match(/^\s*(\S+)/)[1])) return substituteTilde(substituteVars(v.replace(/'/g, '\\\'').replace(/^\s*(.*?);?$/g, 'spawnSync(\'$1\');')));
      return v;
    }
    return v;
  });
  return parts.join('\n');
}
function substituteVars (cmd) {
  var i = 0, start = false, seq = '', j, escapeNext = false;
  while (cmd[i]) {
    if (start || seq) {
      start = false;
      if (/[^\w\$]/.test(cmd[i])) {
        cmd = cmd.substr(0, i - seq.length - 1) + '\' + ' + seq + ' + \'' + cmd.substr(i);
        i += 7;
        seq = '';
        continue;
      }
      seq += cmd[i];
      i++;
      continue;
    }
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
    if (cmd[i] === '$') {
      start = true;
      i++;
      continue;
    }
    i++;
  }
  return cmd;
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
function substituteGlobs (cmd) {
  var i = 0, hasGlob = false, escapeNext = false, possibles = [], parts, globbed = [], basePath, re;
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
    if (cmd[i] === '*') {
      hasGlob = true;
      break;
    }
    i++;
  }
  if (!hasGlob) {
    return cmd;
  } else {
    parts = /(^.*?)\s*(\S*\/)?([^\s\/]*)\*(\S*)\s*(.*)'\);$/.exec(cmd);
    if (typeof parts[2] === 'undefined') parts[2] = '';
    basePath = path.resolve(parts[2]);
    re = RegExp('^' + parts[3] + '.*' + parts[4]);
    fs.readdirSync(basePath).forEach(function (v) {
      if (re.test(v)) globbed.push(escapeSpaces(v));
    });
    globbed.forEach(function (v) {
      possibles.push(cmd.replace(/[^\s\/]*\*\S*(.*'\);)/, v + '$1'));
    });
    return possibles.join('\n');
  } 
}
