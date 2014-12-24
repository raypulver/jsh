var utilInspect = require('util').inspect,
    times = require('./string-multiply'),
    isCircular = require('./is-circular'),
    dateRegex = /(^\d{1,4}[\.|\\/|-]\d{1,2}[\.|\\/|-]\d{1,4})(\s*(?:0?[1-9]:[0-5]|1(?=[012])\d:[0-5])\d\s*[ap]m)?$/,
    invalidKeyRegex = /[^A-Za-z|_]/,
    functionNameRegex = /^{\s+(\[.*?\])/,
    colorRegex = /\033\[.*?m/;
module.exports = function inspect (item, depth) {
  if (typeof depth === 'undefined') depth = 1;
  if (typeof item === 'number' || typeof item === 'boolean' || item === null) return '\033[33m' + item + '\033[39m';
  else if (item.inspect) return item.inspect();
  else if (typeof item === 'string') return '\033[32m\'' + item + '\'\033[39m';
  else if (isCircular(item)) return '\033[36m[Circular]\033[39m';
  else if (typeof item === 'function') {
    var keys = Object.keys(item);
    if (keys.length === 0) return '\033[36m' + utilInspect(item) + '\033[39m';
    else {
      var name = utilInspect(item).match(functionNameRegex)[1];
      var ret = '{ ' + name + ' ';
      var oneLine = true, i = 0, total = name.length;
      while (keys[i]) {
        total += keys[i].length + (invalidKeyRegex.test(keys[i]) ? 2: 0) + inspect(item[keys[i]]).replace(colorRegex, '').length + 4;
        if (total > process.stdout.columns) { oneLine = false; break; }
        i++;
      }
      keys.forEach(function (v, i, arr) {
        if (invalidKeyRegex.test(v)) ret += inspect(v);
        else ret += v;
        ret += ': ' + inspect(item[v], depth + 1);
        if (i !== arr.length - 1) {
          ret += ',' + (oneLine ? ' ': ('\n' + times('  ', depth)));
        } else {
          ret += ' ';
        }
      });
      ret += '}';
      return ret;
    }
  }
  else if (Array.isArray(item)) {
    var ret = '[';
    item.forEach(function (v, i, arr) {
      if (i === 0) ret += ' ';
      ret += inspect(v);
      if (i === arr.length - 1) ret += ' ';
      else ret += ', ';
    });
    ret += ']';
    return ret;
  } else if (isDate(item)) {
    return '\033[35m' + utilInspect(item) + '\033[39m';
  } else if (item.constructor.name === 'RegExp') {
    return '\033[31m' + utilInspect(item) + '\033[39m';
  } else {
    var oneLine = true, i = 0, total = 0, keys = Object.keys(item);
    while (keys[i]) {
      total += keys[i].length + (invalidKeyRegex.test(keys[i]) ? 2: 0) + inspect(item[keys[i]]).replace(colorRegex, '').length + 4;
      if (total > process.stdout.columns) { oneLine = false; break; }
      i++;
    }
    var ret = '{';
    keys.forEach(function (v, i, arr) {
      if (i === 0) ret += ' ';
      if (invalidKeyRegex.test(v)) ret += inspect(v);
      else ret += v;
      ret += ': ' + inspect(item[v], depth + 1);
      if (i !== arr.length - 1) {
        ret += ',' + (oneLine ? ' ': ('\n' + times('  ', depth)));
      } else {
        ret += ' ';
      }
    });
    ret += '}';
    return ret;
  }
};

function isDate (value) {
  return toString.call(value) === '[object Date]';
}
