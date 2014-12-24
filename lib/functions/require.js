var path = require('path');
module.exports = function jshrequire (modulePath) {
  if (/^(\.)?(\.)?\//.test(modulePath)) return require(path.resolve(modulePath));
  else return require(path.join(process.cwd(), 'node_modules', modulePath));
}
