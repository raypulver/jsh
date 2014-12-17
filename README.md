# jsh - The JavaScript Shell
This is a UNIX command-line interpreter which sits on top of both Node.js and sh, allowing you to simultaneously execute JavaScript and shell commands. It is fully compatible with Node modules, and preloads all the built-in Node modules at initialization.

In shell commands, you can use the $ character to substitute a variable from the JavaScript environment.

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

jsh comes with full tab-completion, and you can preload JavaScript in your jsh environment by adding it to your .jshrc, in your home folder. jsh will automatically create this file the first time it is run.
