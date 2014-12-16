
var binding = require('../build/Release/waitfor');

module.exports = function waitfor(pid) {
  return binding.waitfor(pid);
};
