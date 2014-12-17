prompt = function () {
    return '[' + USER + '@' + os.hostname() + ':' + process.cwd().replace(HOME, '~') + '] ';
}
alias ls='ls --color=auto'
