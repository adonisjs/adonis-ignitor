'use strict'

/*
 * adonis-ignitor
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const debug = require('debug')('adonis:ignitor')
const path = require('path')
const fs = require('fs')
const Youch = require('youch')
const forTerminal = require('youch-terminal')

const Helpers = require('../Helpers')
const hooks = require('../Hooks')

const WARNING_MESSAGE = `
  WARNING: Adonis has detected an unhandled promise rejection, which may
  cause undesired behavior in production.
  To stop this warning, use catch() on promises or wrap await
  calls inside try/catch.
`

/**
 * Directories to be binded with resolver
 *
 * @type {Object}
 */
const DIRECTORIES = {
  httpControllers: 'Controllers/Http',
  wsControllers: 'Controllers/Ws',
  models: 'Models',
  modelHooks: 'Models/Hooks',
  modelTraits: 'Models/Traits',
  listeners: 'Listeners',
  exceptions: 'Exceptions',
  middleware: 'Middleware',
  commands: 'Commands',
  validators: 'Validators'
}

class Ignitor {
  constructor (fold) {
    this._fold = fold
    this._appRoot = null
    this._loadCommands = false

    /**
     * Files to be preloaded
     *
     * @type {Array}
     */
    this._preLoadFiles = [
      'start/routes',
      'start/events',
      'start/socket',
      'start/kernel',
      'start/wsKernel'
    ]

    /**
     * The preloaded files that are optional
     *
     * @type {Array}
     */
    this._optionals = [
      'start/events',
      'start/socket',
      'start/kernel',
      'start/wsKernel',
      'database/factory'
    ]

    /**
     * Default app file
     *
     * @type {String}
     */
    this._appFile = 'start/app.js'

    /**
     * Ws server reference to run it
     */
    this._wsServer = {
      run: false,
      customHttpServer: null
    }

    /**
     * The app namespace registered with resolver
     * for autoloading directories
     *
     * @type {String|Null}
     */
    this.appNamespace = null
  }

  /**
   * Returns the matching index of a file
   * inside the preloaded files.
   *
   * @method _getMatchingIndex
   *
   * @param  {String}          fileToMatch
   *
   * @return {Number}
   *
   * @private
   */
  _getMatchingIndex (fileToMatch) {
    for (let file of this._preLoadFiles) {
      if (file === fileToMatch || `${file}.js` === fileToMatch) {
        return this._preLoadFiles.indexOf(file)
      }
    }
    return -1
  }

  /**
   * Calls a given hook
   *
   * @method _callHooks
   *
   * @param  {String}  lifecycle
   * @param  {String}  event
   *
   * @return {void}
   *
   * @private
   */
  _callHooks (lifecycle, event) {
    hooks[lifecycle].get(event).forEach((hook) => hook())
  }

  /**
   * Requires the app package.json file from
   * the app root.
   *
   * @method _setPackageFile
   *
   * @private
   */
  _setPackageFile () {
    this._packageFile = require(path.join(this._appRoot, 'package.json'))
    debug('loading package.json from %s directory', this._appRoot)
  }

  /**
   * Sets up resolver primary namespace and register paths to
   * important directories.
   *
   * @method _setupResolver
   *
   * @param {String} namespace
   *
   * @return {void}
   *
   * @private
   */
  _setupResolver (namespace) {
    this.appNamespace = namespace
    debug('%s is the primary namespace', namespace)

    /**
     * Set app namespace with resolver. So that resolver
     * knows how to make full namespaces.
     */
    this._fold.resolver.appNamespace(this.appNamespace)

    /**
     * Bind directories to resolver, so that we can
     * resolve ioc container paths by passing
     * incremental namespaces.
     */
    this._fold.resolver.directories(DIRECTORIES)
  }

  /**
   * Registers all directories from the package.json file
   * to IoC container as autoloaded.
   *
   * First namespace/directory key/value pair will be used as
   * primary autoloaded directory and doesn't require
   * fullnamespaces at different places.
   *
   * @method _registerAutoloadedDirectories
   *
   * @return {void}
   *
   * @private
   */
  _registerAutoloadedDirectories () {
    let autoloads = this._packageFile.autoload || {}

    /**
     * Defining fallback autoload when nothing autoloads
     * map is empty
     */
    if (Object.keys(autoloads).length === 0) {
      autoloads = { 'App': './app' }
    }

    Object.keys(autoloads).forEach((namespace, index) => {
      const namespaceLocation = path.join(this._appRoot, autoloads[namespace])
      if (index === 0) {
        this._setupResolver(namespace)
      }

      this._fold.ioc.autoload(namespaceLocation, namespace)
      debug('autoloading %s under %s namespace', namespaceLocation, namespace)
    })
  }

  /**
   * Registers the helpers module to the IoC container.
   * Required by a lot of providers before hand.
   *
   * @method _registerHelpers
   *
   * @return {void}
   *
   * @private
   */
  _registerHelpers () {
    this._fold.ioc.singleton('Adonis/Src/Helpers', () => new Helpers(this._appRoot))
    this._fold.ioc.alias('Adonis/Src/Helpers', 'Helpers')
    debug('registered helpers')
  }

  /**
   * Return the exported values from the appFile. Also
   * it will validate the exports object to have all
   * required keys.
   *
   * @method _getAppAttributes
   *
   * @return {Object}
   *
   * @private
   */
  _getAppAttributes () {
    return require(path.join(this._appRoot, this._appFile))
  }

  /**
   * Registers an array of providers to the Ioc container. This
   * method will make use of the `appFile` to get the providers
   * list.
   *
   * @method _registerProviders
   *
   * @return {void}
   *
   * @private
   */
  _registerProviders () {
    this._callHooks('before', 'providersRegistered')

    /**
     * Getting list of providers and registering them.
     */
    const { providers, aceProviders } = this._getAppAttributes()
    const providersToRegister = this._loadCommands ? providers.concat(aceProviders) : providers
    this._fold.registrar.providers(providersToRegister).register()

    debug('registered providers')
    this._callHooks('after', 'providersRegistered')
  }

  /**
   * Boot providers
   *
   * @method _bootProviders
   *
   * @return {void}
   *
   * @async
   *
   * @private
   */
  async _bootProviders () {
    this._callHooks('before', 'providersBooted')

    /**
     * The providers set set on `registrar` when they were registered. We
     * use the same set to boot the previously registered providers.
     */
    await this._fold.registrar.boot()

    debug('booted providers')
    this._callHooks('after', 'providersBooted')
  }

  /**
   * Define aliases for all providers.
   *
   * @method _defineAliases
   *
   * @return {void}
   *
   * @private
   */
  _defineAliases () {
    const { aliases } = this._getAppAttributes() || {}
    Object.keys(aliases).forEach((alias) => {
      this._fold.ioc.alias(aliases[alias], alias)
    })
  }

  /**
   * Whether or not a preloaded file is part of
   * optional list
   *
   * @method _isOptional
   *
   * @param  {String}    filePath
   *
   * @return {Boolean}
   *
   * @private
   */
  _isOptional (filePath) {
    return this._optionals.indexOf(filePath) > -1
  }

  /**
   * Returns a boolean telling whether a file exists
   * or not
   *
   * @method _fileExists
   *
   * @param  {String}            filePath
   *
   * @return {Boolean}
   *
   * @private
   */
  _fileExists (filePath) {
    filePath = path.extname(filePath) ? filePath : `${filePath}.js`

    try {
      fs.accessSync(filePath, fs.constants.R_OK)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Load all the files that are supposed to be preloaded
   *
   * @method _loadPreLoadFiles
   *
   * @return {void}
   *
   * @private
   */
  _loadPreLoadFiles () {
    this._callHooks('before', 'preloading')
    debug('preloading files %j', this._preLoadFiles)
    debug('optional set %j', this._optionals)

    this._preLoadFiles.forEach((file) => {
      const filePath = path.isAbsolute(file) ? file : path.join(this._appRoot, file)

      /**
       * Require file when it's not optional or when optional
       * file exists
       */
      if (!this._isOptional(file) || this._fileExists(filePath)) {
        require(filePath)
      }
    })

    this._callHooks('after', 'preloading')
  }

  /**
   * Conditionally loads the hooks file.
   *
   * @method _loadHooksFileIfAny
   *
   * @return {void}
   *
   * @private
   */
  _loadHooksFileIfAny () {
    const filePath = path.join(this._appRoot, 'start/hooks.js')
    if (this._fileExists(filePath)) {
      require(path.join(this._appRoot, 'start/hooks.js'))
    }
  }

  /**
   * Registers the ace commands with ace module
   *
   * @method _registerCommands
   *
   * @return {void}
   *
   * @preserve
   */
  _registerCommands () {
    this._callHooks('before', 'registerCommands')

    const { commands } = this._getAppAttributes()
    const ace = require(path.join(this._appRoot, '/node_modules/@adonisjs/ace'))
    commands.forEach((command) => ace.addCommand(command))

    this._callHooks('after', 'registerCommands')
  }

  /**
   * Pretty prints the error to the terminal
   *
   * @method _printError
   *
   * @param  {Object}    error
   *
   * @return {void}
   *
   * @private
   */
  async _printError (error) {
    const output = await new Youch(error, {}).toJSON()
    console.log(forTerminal(output))
    process.exit(1)
  }

  /**
   * Start the http server using server and env
   * provider
   *
   * @param {Object} httpServerCallback
   *
   * @method _startHttpServer
   * @async
   *
   * @return {void}
   *
   * @private
   */
  async _startHttpServer (httpServerCallback) {
    this._callHooks('before', 'httpServer')

    const Server = this._fold.ioc.use('Adonis/Src/Server')
    const Env = this._fold.ioc.use('Adonis/Src/Env')

    /**
     * If a custom http instance is defined, set it
     * on the server provider.
     */
    if (typeof (httpServerCallback) === 'function') {
      debug('binding custom http instance to adonis server')
      const instance = httpServerCallback(Server.handle.bind(Server))
      Server.setInstance(instance)
    }

    /**
     * Run the Ws server when instructured
     */
    if (this._wsServer.run) {
      this._startWsServer(this._wsServer.customHttpServer || Server.getInstance())
    }

    /**
     * Start the server
     */
    Server.listen(Env.get('HOST'), Env.get('PORT'), (error) => {
      if (error) {
        this._printError(error)
        return
      }

      if (typeof (process.emit) === 'function') {
        process.emit('adonis:server:start')
      }

      this._listenForSigEvents()
      this._callHooks('after', 'httpServer')
    })
  }

  /**
   * Starts the websocket servers
   *
   * @method _startWsServer
   *
   * @param  {Http.Server}       httpServer
   *
   * @return {void}
   *
   * @private
   */
  _startWsServer (httpServer) {
    this._fold.ioc.use('Adonis/Addons/Ws').listen(httpServer)
  }

  /* istanbul ignore next */
  /**
   * Invokes the ace command
   *
   * @method _invokeAce
   *
   * @return {void}
   *
   * @private
   */
  _invokeAce () {
    this._callHooks('before', 'aceCommand')

    const ace = require(path.join(this._appRoot, '/node_modules/@adonisjs/ace'))
    ace.wireUpWithCommander()

    /**
     * Fire after `aceCommand` hook, before process goes down.
     */
    process.once('beforeExit', () => (this._callHooks('after', 'aceCommand')))

    /**
     * Listen for command errors
     */
    ace.onError((error) => (this._printError(error)))

    ace.invoke({ version: this._packageFile['adonis-version'] || 'NA' })
  }

  /* istanbul ignore next */
  /**
   * Binds the listener to gracefully shutdown
   * the server
   *
   * @method _listenForSigEvents
   *
   * @return {void}
   *
   * @private
   */
  _listenForSigEvents () {
    /**
     * Gracefully closing http server
     */
    process.on('SIGTERM', () => {
      debug('Gracefully stopping http server')

      /**
       * Also close the ws server
       */
      if (this._wsServer.run) {
        const Ws = this._fold.ioc.use('Adonis/Addons/Ws')
        Ws.close()
      }

      const Server = this._fold.ioc.use('Adonis/Src/Server')
      Server.close(process.exit)
    })
  }

  /* istanbul ignore next */
  /**
   * Binds a listener for `unhandledRejection` to make sure all promises
   * rejections are handled by the app
   *
   * @method _listenForUnhandledRejection
   *
   * @return {void}
   *
   * @private
   */
  _listenForUnhandledRejection () {
    process.once('unhandledRejection', (response) => {
      try {
        this._fold.ioc.use('Adonis/Src/Logger').warning(WARNING_MESSAGE)
      } catch (error) {
        console.warn(WARNING_MESSAGE)
      }
      console.error(response)
    })
  }

  /**
   * Preloads a file by appending it to the end
   * of the preloads list.
   *
   * @method preLoad
   *
   * @param  {String} filePath
   *
   * @chainable
   */
  preLoad (filePath) {
    this._preLoadFiles.push(filePath)
    return this
  }

  /**
   * Preload a file after a given file. If the `afterFile`
   * is not matched, the file is appended to the end
   * of the list.
   *
   * @method preLoadAfter
   *
   * @param  {String}     afterFilePath
   * @param  {String}     filePath
   *
   * @chainable
   */
  preLoadAfter (afterFilePath, filePath) {
    const matchedIndex = this._getMatchingIndex(afterFilePath)

    if (matchedIndex === -1) {
      return this.preLoad(filePath)
    }

    this._preLoadFiles.splice((matchedIndex + 1), 0, filePath)
    return this
  }

  /**
   * Prepend file to the list of preloads before a given
   * file.
   *
   * If the `afterFile` is not matched, the file is appended
   * to the end of the list.
   *
   * @method preLoadBefore
   *
   * @param  {String}      afterFilePath
   * @param  {String}      filePath
   *
   * @chainable
   */
  preLoadBefore (afterFilePath, filePath) {
    const matchedIndex = this._getMatchingIndex(afterFilePath)

    if (matchedIndex === -1) {
      return this.preLoad(filePath)
    }

    this._preLoadFiles.splice(matchedIndex, 0, filePath)
    return this
  }

  /**
   * Set application app root
   *
   * @method appRoot
   *
   * @param  {String} location
   *
   * @chainable
   */
  appRoot (location) {
    this._appRoot = location
    return this
  }

  /**
   * Set the application file. This file exports
   * an array of providers, aceProviders, aliases
   * and commands.
   *
   * @method appFile
   *
   * @param  {String} location
   *
   * @chainable
   */
  appFile (location) {
    this._appFile = location
    return this
  }

  /**
   * Instructor ignitor to load and register
   * commands with ace before firing anything.
   *
   * @method loadCommands
   *
   * @chainable
   */
  loadCommands () {
    this._loadCommands = true
    return this
  }

  /**
   * Sets up fire by performing following
   * operations in sequence.
   *
   * 1. Register helpers.
   * 2. Load hooks file ( if any ).
   * 3. Register providers.
   * 4. Boot providers.
   * 5. Defined Aliases.
   * 6. Load files to be preload.
   * 7. Start http server.
   *
   * @method fire
   *
   * @return {void}
   *
   * @throws {Error} If app root has not be defined
   */
  async fire () {
    this._listenForUnhandledRejection()

    if (!this._appRoot) {
      throw new Error('Cannot start http server, make sure to register the app root inside server.js file')
    }

    /**
     * Load the package.json file
     */
    this._setPackageFile()

    /**
     * Registers directories to be autoloaded defined
     * under `package.json` file.
     */
    this._registerAutoloadedDirectories()

    /**
     * Register the helpers binding. So that all providers must have
     * access to it.
     */
    this._registerHelpers()

    /**
     * Registering hooks, so that end user can bind hooks callbacks
     */
    this._loadHooksFileIfAny()

    /**
     * Register + Boot providers
     */
    this._registerProviders()
    await this._bootProviders()

    /**
     * Define aliases by reading them from the `start/app.js` file, so that
     * pre-defined aliases are overridden by the user defined aliases.
     */
    this._defineAliases()

    /**
     * Register commands when loadCommands is set to true.
     */
    if (this._loadCommands) {
      this._registerCommands()
    }

    /**
     * Finally load the files to be preloaded
     */
    this._loadPreLoadFiles()
  }

  /**
   * This method will instruct ignitor to run
   * the websocket server along with the
   * http server
   *
   * @method wsServer
   *
   * @param  {Http.Server} [httpServer]
   *
   * @chainable
   */
  wsServer (httpServer = null) {
    this._wsServer.run = true
    this._wsServer.customHttpServer = httpServer
    return this
  }

  /**
   * Starts the Adonis http server.
   *
   * @method fireHttpServer
   *
   * @param {Function} httpServerCallback
   *
   * @return {void}
   */
  async fireHttpServer (httpServerCallback) {
    try {
      await this.fire()
      await this._startHttpServer(httpServerCallback)
    } catch (error) {
      this._printError(error)
    }
  }

  /**
   * Runs the ace command
   *
   * @method fireAce
   *
   * @return {void}
   */
  async fireAce () {
    /**
     * Since ignitor is just used by Adonis, I am taking the privelage
     * to update the `NODE_ENV` to testing when `test` command is
     * executed.
     *
     * This is the only place I can do this weird thing, since everything
     * else is executed once the app has been booted, and changing
     * the node env will have no impact.
     */
    if (process.argv.slice(2)[0] === 'test') {
      process.env.NODE_ENV = 'testing'
    }

    /**
     * Load database/factory.js file when loading
     * ace commands
     */
    this.preLoad('database/factory')

    try {
      this.loadCommands()
      await this.fire()
      this._invokeAce()
    } catch (error) {
      this._printError(error)
    }
  }
}

module.exports = Ignitor
