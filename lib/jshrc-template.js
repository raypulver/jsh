prompt = function () {
    return '[' + USER + '@' + os.hostname() + ':' + process.cwd().replace(HOME, '~') + '] ';
}
child_process.exec('ls --color=auto', function (err, stdout, stderr) {
  if (!stderr) alias ls='ls --color=auto'
});
