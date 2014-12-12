var fs = require('fs'),
    format = require('util').format;
module.exports = function (dir) {
  if (!dir) console.error('Directory not specified.');
  if (!fs.existsSync(dir)) console.error('No such file or directory: ' + dir);
  else {
    try {
      process.chdir(dir);
    } catch (e) {
      console.log(format('%s: %s', e.name, e.message));
    }
  }
};
