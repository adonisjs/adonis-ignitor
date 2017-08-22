'use strict'

/*
 * adonis-ignitor
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const test = require('japa')
const clearRequire = require('clear-require')
const { Env } = require('@adonisjs/sink')
const fold = require('@adonisjs/fold')
const hooks = require('../src/Hooks')
const Ignitor = require('../src/Ignitor')
const fs = require('fs-extra')

test.group('Ignitor', (group) => {
  group.beforeEach(() => {
    hooks.before.clear()
    hooks.after.clear()
    fold.ioc._autoloads = {}
    fold.ioc._aliases = {}
    clearRequire(path.join(__dirname, 'start/app.js'))
    clearRequire(path.join(__dirname, 'package.json'))
    fold.ioc.restore()
    fold.ioc.fake('Adonis/Src/Exception', () => {
      return { bind () {} }
    })
  })

  test('register app root', (assert) => {
    const ignitor = new Ignitor()
    ignitor.appRoot('foo')
    assert.equal(ignitor._appRoot, 'foo')
  })

  test('default app file to start/app.js', (assert) => {
    const ignitor = new Ignitor()
    assert.equal(ignitor._appFile, 'start/app.js')
  })

  test('register app file', (assert) => {
    const ignitor = new Ignitor()
    ignitor.appFile('start/app.js')
    assert.equal(ignitor._appFile, 'start/app.js')
  })

  test('add file to preloaded list', (assert) => {
    const ignitor = new Ignitor()
    ignitor.preLoad('start/foo.js')
    assert.include(ignitor._preLoadFiles, 'start/foo.js')
  })

  test('add file after given file in preload list', (assert) => {
    const ignitor = new Ignitor()
    ignitor.preLoadAfter('start/routes', 'start/foo.js')
    assert.equal(ignitor._preLoadFiles[1], 'start/foo.js')
  })

  test('append to the end when matching file not found', (assert) => {
    const ignitor = new Ignitor()
    ignitor.preLoadAfter('start/ooo', 'start/foo.js')
    assert.equal(ignitor._preLoadFiles[ignitor._preLoadFiles.length - 1], 'start/foo.js')
  })

  test('recognize when matching files have/missing extensions', (assert) => {
    const ignitor = new Ignitor()
    ignitor.preLoadAfter('start/routes.js', 'start/foo.js')
    assert.equal(ignitor._preLoadFiles[1], 'start/foo.js')
  })

  test('append before a given file', (assert) => {
    const ignitor = new Ignitor()
    ignitor.preLoadBefore('start/events', 'start/foo.js')
    assert.equal(ignitor._preLoadFiles[1], 'start/foo.js')
  })

  test('push to last when unable to find before file', (assert) => {
    const ignitor = new Ignitor()
    ignitor.preLoadBefore('start/non-existing', 'start/foo.js')
    assert.equal(ignitor._preLoadFiles[ignitor._preLoadFiles.length - 1], 'start/foo.js')
  })

  test('throw exception when trying to fire without app root', async (assert) => {
    assert.plan(1)
    const ignitor = new Ignitor()
    try {
      await ignitor.fireHttpServer()
    } catch ({ message }) {
      assert.equal(message, 'Cannot start http server, make sure to register the app root inside server.js file')
    }
  })

  test('register providers by requiring the app file', (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    ignitor.fireHttpServer()
  })

  test('emit before and after registered provider events', (assert) => {
    const ignitor = new Ignitor(fold)
    const events = []
    hooks.before.providersRegistered(() => {
      events.push('before')
    })
    hooks.after.providersRegistered(() => {
      events.push('after')
    })
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    ignitor.fireHttpServer()
    assert.deepEqual(events, ['before', 'after'])
  })

  test('emit multiple hooks in sequence', (assert) => {
    const ignitor = new Ignitor(fold)
    const events = []
    hooks
      .before
      .providersRegistered(() => {
        events.push('before')
      })
      .providersRegistered(() => {
        events.push('before 1')
      })

    hooks
      .after
      .providersRegistered(() => {
        events.push('after')
      })
      .providersRegistered(() => {
        events.push('after 1')
      })

    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    ignitor.fireHttpServer()
    assert.deepEqual(events, ['before', 'before 1', 'after', 'after 1'])
  })

  test('boot providers after registering them', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    await ignitor.fireHttpServer()
    assert.deepEqual(fold.registrar._providers[0]._events, ['register', 'boot'])
  })

  test('wait until providers have been booted', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    const appFile = require(path.join(__dirname, ignitor._appFile))
    appFile.providers = [
      path.join(__dirname, './providers/SlowProvider')
    ]
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    await ignitor.fireHttpServer()
    assert.deepEqual(fold.registrar._providers[0]._events, ['register', 'boot'])
  })

  test('emit booted events in right order', async (assert) => {
    const ignitor = new Ignitor(fold)
    const events = []
    hooks
      .before
      .providersRegistered(() => events.push('before registered'))
      .providersBooted(() => events.push('before booted'))

    hooks
      .after
      .providersRegistered(() => events.push('after registered'))
      .providersBooted(() => events.push('after booted'))

    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    await ignitor.fireHttpServer()
    assert.deepEqual(events, ['before registered', 'after registered', 'before booted', 'after booted'])
  })

  test('register aliases for providers when defined', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    const appFile = require(path.join(__dirname, ignitor._appFile))

    appFile.aliases = {
      Route: 'Adonis/Src/Route',
      Server: 'Adonis/Src/Server'
    }

    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    await ignitor.fireHttpServer()
    assert.property(fold.ioc._aliases, 'Route')
    assert.property(fold.ioc._aliases, 'Server')
  })

  test('load files to be preloaded', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = ['start/routes', 'start/events']
    ignitor._startHttpServer = function () {}
    await ignitor.fireHttpServer()
  })

  test('call preloading hooks', async (assert) => {
    const ignitor = new Ignitor(fold)
    const events = []
    hooks
      .before.preloading(() => events.push('before preloading'))

    hooks.after.preloading(() => events.push('after preloading'))

    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    ignitor._startHttpServer = function () {}
    await ignitor.fireHttpServer()
    assert.deepEqual(events, ['before preloading', 'after preloading'])
  })

  test('load ace providers when fireAce command is called', async (assert) => {
    assert.plan(1)
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    const appFile = require(path.join(__dirname, ignitor._appFile))
    appFile.aceProviders = ['Adonis/Src/Command']
    try {
      await ignitor.fireAce()
    } catch ({ message }) {
      assert.equal(message, `Cannot find module 'Adonis/Src/Command'`)
    }
  })

  test('setup resolver', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    await ignitor.fire()
    assert.property(fold.resolver._directories, 'httpControllers')
    assert.property(fold.resolver._directories, 'models')
    assert.deepEqual(fold.ioc._autoloads, { 'App': path.join(__dirname, './app') })
  })

  test('setup default namespace when autoload key is defined but values are missing', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    const pkgFile = require(path.join(__dirname, './package.json'))
    pkgFile.autoload = {}
    ignitor._preLoadFiles = []
    await ignitor.fire()
    assert.deepEqual(fold.ioc._autoloads, { 'App': path.join(__dirname, './app') })
  })

  test('use package file autoload values when defined', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    const pkgFile = require(path.join(__dirname, './package.json'))
    pkgFile.autoload = {
      'MyApp': './app'
    }
    ignitor._preLoadFiles = []
    await ignitor.fire()
    assert.deepEqual(fold.ioc._autoloads, { 'MyApp': path.join(__dirname, './app') })
  })

  test('load ace commands when loadCommands method is called', async (assert) => {
    assert.plan(1)
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    ignitor._preLoadFiles = []
    const appFile = require(path.join(__dirname, ignitor._appFile))
    appFile.aceProviders = ['Adonis/Src/Command']
    try {
      await ignitor.loadCommands().fire()
    } catch ({ message }) {
      assert.equal(message, `Cannot find module 'Adonis/Src/Command'`)
    }
  })

  test('setup exception handler to adonis provider when there is no exceptions handler', (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    assert.plan(2)

    class Exception {
      bind (name, handler) {
        assert.equal(name, '*')
        assert.equal(handler, '@provider:Adonis/Exceptions/Handler')
      }
    }

    fold.ioc.fake('Adonis/Src/Exception', function () {
      return new Exception()
    })

    ignitor._setPackageFile()
    ignitor._setupResolver()
    ignitor._setupExceptionsHandler()
  })

  test('setup exception handler to global handler when defined', async (assert) => {
    const ignitor = new Ignitor(fold)

    ignitor.appRoot(path.join(__dirname, './'))
    assert.plan(2)
    await fs.outputFile(path.join(__dirname, './app/Exceptions/Handler.js'), 'module.exports = {}')

    class Exception {
      bind (name, handler) {
        assert.equal(name, '*')
        assert.equal(handler, 'App/Exceptions/Handler')
      }
    }

    fold.ioc.fake('Adonis/Src/Exception', function () {
      return new Exception()
    })

    ignitor._setPackageFile()
    ignitor._setupResolver()
    ignitor._setupExceptionsHandler()
    await fs.remove(path.join(__dirname, './app'))
  })

  test('register helpers module', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    await ignitor.fire()
    assert.isDefined(fold.ioc.use('Adonis/Src/Helpers'))
  })

  test('define alias for helpers module', async (assert) => {
    const ignitor = new Ignitor(fold)
    ignitor.appRoot(path.join(__dirname, './'))
    await ignitor.fire()
    assert.isDefined(fold.ioc.use('Helpers'))
  })

  test('call httpServer hooks when starting http server', async (assert) => {
    const ignitor = new Ignitor(fold)

    class Server {
      listen (h, p, cb) { cb() }
    }

    const events = []
    hooks.before.httpServer(() => {
      events.push('before:httpServer')
    })

    hooks.after.httpServer(() => {
      events.push('after:httpServer')
    })

    fold.ioc.fake('Adonis/Src/Server', () => new Server())
    fold.ioc.fake('Adonis/Src/Env', () => new Env())

    ignitor.appRoot(path.join(__dirname, './'))
    await ignitor.fireHttpServer()
    assert.deepEqual(events, ['before:httpServer', 'after:httpServer'])
  })
})
