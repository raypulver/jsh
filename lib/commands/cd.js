var fs = require('fs');
module.exports = function (dir) {
  if (!dir) this.error('Directory not specified.');
  if (!fs.existsSync(dir)) this.error('No such file or directory: ' + dir);
  else process.chdir(dir);
};
