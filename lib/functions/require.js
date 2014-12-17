var path = require('path');
module.exports = function jshrequire (modulePath) {
  if (/^\.{0, 2}\//.test(modulePath)) return require(path.resolve(modulePath));
  else return require(path.join(process.cwd(), 'node_modules', modulePath));
}
