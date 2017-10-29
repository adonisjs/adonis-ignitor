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
const exitHook = require('exit-hook')

const Helpers = require('../Helpers')
const hooks = require('../Hooks')

const WARNING_MESSAGE = `
  WARNING: Adonis has detected an unhandled promise rejection, which may
  cause undesired behavior in production.
  To stop this warning, use catch() on promises and wrap await
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
  exceptionHandlers: 'Exceptions/Handlers',
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
      'database/factory'
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
      'database/factory'
    ]

    /**
     * Default app file
     *
     * @type {String}
     */
    this._appFile = 'start/app.js'

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
   * This method sets the global exception handler for handling exceptions.
   * By default it will rely on a global exceptions handler defined in
   * `Exceptions/Handlers/Global.js` file, if not provided, fallsback
   * to `@provider:Adonis/Exception/Handler`.
   *
   * Also this operation should happen before loading the kernel.js file.
   * Since that file allows overriding the exceptions handler.
   *
   * @method _setupExceptionsHandler
   *
   * @return {void}
   *
   * @private
   */
  _setupExceptionsHandler () {
    const handleRelativePath = `${DIRECTORIES['exceptions']}/Handler`
    try {
      require(path.join(this._appRoot, 'app', handleRelativePath))
      debug('using %s for handling exceptions', `${this.appNamespace}/${handleRelativePath}`)
      this._fold.ioc.use('Adonis/Src/Exception').bind('*', `${this.appNamespace}/${handleRelativePath}`)
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw error
      }
      debug('using %s for handling exceptions', '@provider:Adonis/Exceptions/Handler')
      this._fold.ioc.use('Adonis/Src/Exception').bind('*', '@provider:Adonis/Exceptions/Handler')
    }
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
    this._fold.ioc.singleton('Adonis/Src/Helpers', () => {
      return new Helpers(this._appRoot)
    })
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
      try {
        const filePath = path.isAbsolute(file) ? file : path.join(this._appRoot, file)
        require(filePath)
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND' || !this._isOptional(file)) {
          throw error
        }
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
    try {
      return require(path.join(this._appRoot, 'start/hooks.js'))
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw error
      }
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
     * Start the server
     */
    Server.listen(Env.get('HOST'), Env.get('PORT'), () => {
      if (typeof (process.emit) === 'function') {
        process.emit('adonis:server:start')
      }
      this._callHooks('after', 'httpServer')
    })
  }

  /**
   * Binds the listener to gracefully shutdown
   * the server
   *
   * @method _gracefullyShutDown
   *
   * @return {void}
   *
   * @private
   */
  _gracefullyShutDown () {
    /**
     * Gracefully closing http server
     */
    exitHook(() => {
      const Server = this._fold.ioc.use('Adonis/Src/Server')
      Server.getInstance().once('close', function () {
        process.exit(0)
      })
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
    process.once('unhandledRejection', (response) => {
      try {
        this._fold.ioc.use('Adonis/Src/Logger').warning(WARNING_MESSAGE)
      } catch (error) {
        console.warn(WARNING_MESSAGE)
      }
      console.error(response)
    })

    if (!this._appRoot) {
      throw new Error('Cannot start http server, make sure to register the app root inside server.js file')
    }

    this._setPackageFile()
    this._registerAutoloadedDirectories()
    this._registerHelpers()
    this._loadHooksFileIfAny()
    this._registerProviders()
    await this._bootProviders()
    this._defineAliases()
    this._setupExceptionsHandler()

    /**
     * Register commands when loadCommands is set to true.
     */
    if (this._loadCommands) {
      this._registerCommands()
    }

    this._loadPreLoadFiles()
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
    await this.fire()
    await this._startHttpServer(httpServerCallback)
    this._gracefullyShutDown()
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

    this.loadCommands()
    await this.fire()
    const ace = require(path.join(this._appRoot, '/node_modules/@adonisjs/ace'))
    ace.wireUpWithCommander()
    const version = this._packageFile['adonis-version'] || 'NA'
    ace.invoke({ version })
  }
}

module.exports = Ignitor
