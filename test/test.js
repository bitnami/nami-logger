'use strict';
const expect = require('expect.js');
const Logger = require('../');
const DelegatedLogger = require('../delegated-logger');
const colors = require('colors/safe');
const levelsConfig = require('../lib/config.js');
const intercept = require('intercept-stdout');
const tmp = require('tmp');
const fs = require('fs');

function colorize(text, color) {
  return colors[color](text);
}

function runIntercepted(fn) {
  let capturedStdout = '';
  const unhookIntercept = intercept(function(txt) {
    capturedStdout += txt;
    return '';
  });
  try {
    fn();
  } finally {
    unhookIntercept();
  }
  return capturedStdout;
}
describe('Logger', function() {
  describe('level', function() {
    it('should return the default level if not set', function() {
      const l = new Logger();
      expect(l.level).to.be('info');
    });

    it('should return the level set when initializing Logger', function() {
      // This might be broken, if you pass logFileLevel on it's own, getLogFileLevel returns -1, as
      // it is returning the minimum of this.level and this.logFileLevel, however, shouldn't it be
      // returning 1 (since it is the default level) if that's the case?
      const l = new Logger({level: 'error', logFileLevel: 'error'});
      expect(l.level).to.be('error');
    });
  });
  describe('#log()', function() {
    it('should log the message to stdout', function() {
      const l = new Logger();
      expect(runIntercepted(() => l.log('info', 'hello', 'world')))
        .to.be(`${colors[levelsConfig.colors.info]('INFO ')} hello world\n`);
    });
    it('info() message', function() {
      const l = new Logger();
      expect(runIntercepted(() => l.info('hello world')))
        .to.be(`${colors[levelsConfig.colors.info]('INFO ')} hello world\n`);
    });
    it('error() message', function() {
      const l = new Logger();
      expect(runIntercepted(() => l.error('hello world')))
        .to.be(`${colors[levelsConfig.colors.error]('ERROR')} hello world\n`);
    });

    it("doesn't log lower log levels", function() {
      let l = new Logger();
      expect(runIntercepted(() => l.log('DEBUG', 'hello', 'world')))
        .to.be('');

      l = new Logger({level: 'error'});
      expect(runIntercepted(() => l.log('INFO', 'hello', 'world')))
        .to.be('');
    });

    it('Fully silent log', function() {
      let l = new Logger();
      expect(runIntercepted(() => l.error('hello world')))
        .to.match(/hello world/);

      l = new Logger({level: 'silent'});
      expect(runIntercepted(() => l.error('hello world'))).to.be('');
    });

    it('logs to file if log file specified when Logger is initialized', function(done) {
      const tmpFile = tmp.tmpNameSync();
      const l = new Logger({logFile: tmpFile});

      expect(runIntercepted(() => l.info('hello', 'world')))
        .to.be(`${colors[levelsConfig.colors.info]('INFO ')} hello world\n`);

      setTimeout(function() {
        expect(fs.readFileSync(tmpFile, {encoding: 'utf8'})).to.match(/INFO\s+hello world\n$/);
        fs.unlinkSync(tmpFile);
        done();
      }, 200);
    });

    it('can log different levels for file and stdout', function(done) {
      const tmpFile = tmp.tmpNameSync();
      const l = new Logger({logFile: tmpFile, level: 'error', fileLogLevel: 'info'});

      expect(runIntercepted(() => l.info('hello world')))
        .to.be('');

      setTimeout(function() {
        expect(fs.readFileSync(tmpFile, {encoding: 'utf8'})).to.match(/INFO\s+hello world\n$/);
        fs.unlinkSync(tmpFile);
        done();
      }, 200);
    });
  });
});

describe('DelegatedLogger', function() {
  describe('Wrapping', function() {
    it('Supports wrapping an existing Logger', function(done) {
      const tmpFile = tmp.tmpNameSync();
      const l = new Logger({logFile: tmpFile});
      expect(runIntercepted(() => l.info('hello world')))
        .to.be(`${colorize('INFO ', levelsConfig.colors.info)} hello world\n`);
      const wrappedLogger = new DelegatedLogger(l, {prefix: 'wrapped', prefixColor: 'white'});
      expect(runIntercepted(() => wrappedLogger.info('hello world')))
        .to.be(`${colorize('wrapped', 'white')} ${colorize('INFO ', levelsConfig.colors.info)} hello world\n`);
      setTimeout(function() {
        expect(fs.readFileSync(tmpFile, {encoding: 'utf8'})).to.match(/INFO\s+hello world\n$/);
        fs.unlinkSync(tmpFile);
        done();
      }, 200);
    });
  });
});
