# jsh - The JavaScript Shell
jsh is a UNIX command-line interpreter which sits on top of both Node.js and sh, allowing you to simultaneously execute JavaScript and shell commands. It is fully compatible with Node modules, and preloads all the built-in Node modules at initialization, as well as any modules in ~/.jsh/node_modules, automatically converting to camel-case where necessary.

In shell commands, you can use the $ character to substitute a variable from the JavaScript environment. Alternatively you can surround any JavaScript expression in brackets and precede it with a $ character to perform substitutions.

## Installation:

```
$ npm install -g jsh
```

## Examples:
```
$ var p = './dir';
$ if (fs.existsSync(p))
.. fs.readdirSync(p).forEach(function (v) {
.... echo $v
.... });
```

This will echo the filenames of all the files in ./dir

Of course, you can also execute shell commands from within JavaScript functions:

```
$ function moveOut (v) {
.. mv $v ../
.. console.log(v + ' has been moved to the parent directory.');
.. }
$ moveOut('file')
```

An example with brackets:
```
$ function removetxt (v) {
.. rm ${v + '.txt'}
.. }
```

jsh comes with full tab-completion, and you can preload JavaScript in your jsh environment by adding it to your .jshrc, in your home folder. jsh will automatically create this file the first time it is run.

### Known Bugs
jsh does not work well as a default shell for tmux. When an external command is executed, jsh uses a C++ addon (which calls waitpid) to block the current process until the child process finishes executing. When tmux changes panes, for some reason jsh thinks that the child process has quit, and it returns to the shell without killing the actual process. When using programs like ssh or irssi on top of jsh in tmux, this makes the pane unusable and you have to :kill-pane to close it. I would be grateful for any suggestions as to how to fix this.

When jsh is used as a default shell, the VIM plugin Syntastic will report that your default shell does not support redirection (when in fact redirection does work properly). Any hint as to why this is would be greatly appreciated.

At this stage, jsh is very suitable as a secondary shell.
