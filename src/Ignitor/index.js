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
const Helpers = require('../Helpers')
const hooks = require('../Hooks')

class Ignitor {
  constructor (fold) {
    this._fold = fold
    this._appRoot = null

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
      'database/factory'
    ]

    /**
     * Default app file
     *
     * @type {String}
     */
    this._appFile = 'start/app.js'
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
  }

  /**
   * Sets up resolver by registering paths to important
   * directories and setting up the autoloaded path
   * to the IoC container.
   *
   * @method _setupResolver
   *
   * @return {void}
   */
  _setupResolver () {
    const autoload = this._packageFile.autoload || {}
    let [ namespace ] = Object.keys(autoload)
    namespace = namespace || 'App'

    /**
     * Set app namespace with resolver. So that resolver
     * knows how to make full namespaces.
     */
    this._fold.resolver.appNamespace(namespace)

    /**
     * Setting up the autoloaded directory
     */
    this._fold.ioc.autoload(autoload[namespace] || './app', namespace)

    /**
     * Bind directories to resolver, so that we can
     * resolve ioc container paths by passing
     * incremental namespaces.
     */
    this._fold.resolver.directories({
      httpControllers: 'Controllers/Http',
      wsControllers: 'Controllers/Ws',
      models: 'Models',
      listeners: 'Listeners',
      exceptions: 'Exceptions',
      middleware: 'Middleware',
      commands: 'Commands'
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
    this._fold.ioc.singleton('Adonis/Src/Helpers', () => {
      return new Helpers(this._appRoot)
    })
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
   * @param {String} registerForAce
   *
   * @method _registerProviders
   *
   * @return {void}
   *
   * @private
   */
  _registerProviders (registerForAce) {
    this._callHooks('before', 'providersRegistered')

    /**
     * Getting list of providers and registering them.
     */
    const { providers, aceProviders } = this._getAppAttributes()
    const providersToRegister = registerForAce ? providers.concat(aceProviders) : providers
    this._fold.registrar.providers(providersToRegister).register()

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

    this._preLoadFiles.forEach((file) => {
      try {
        require(path.join(this._appRoot, file))
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
      require(path.join(this._appRoot, 'start/hooks.js'))
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
   * @param  {Object}          ace
   *
   * @return {void}
   *
   * @preserve
   */
  _registerCommands (ace) {
    this._callHooks('before', 'registerCommands')

    const { commands } = this._getAppAttributes()
    ace.register(commands)

    this._callHooks('after', 'registerCommands')
  }

  /**
   * Start the http server using server and env
   * provider
   *
   * @param {Object} customHttpInstance
   *
   * @method _startHttpServer
   *
   * @return {void}
   *
   * @private
   */
  _startHttpServer (customHttpInstance) {
    this._callHooks('before', 'httpServer')

    const Server = this._fold.use('Adonis/Src/Server')
    const Env = this._fold.use('Adonis/Src/Env')

    /**
     * If a custom http instance is defined, set it
     * on the server provider.
     */
    if (customHttpInstance) {
      Server.setInstance(customHttpInstance)
    }
    Server.listen(Env.get('host'), Env.get('port'))

    this._callHooks('after', 'httpServer')
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
   * @param  {Boolean} registerForAce
   *
   * @return {void}
   *
   * @throws {Error} If app root has not be defined
   */
  async fire (registerForAce = false) {
    if (!this._appRoot) {
      throw new Error('Cannot start http server, make sure to register the app root inside server.js file')
    }

    this._setPackageFile()
    this._setupResolver()
    this._registerHelpers()
    this._loadHooksFileIfAny()
    this._registerProviders(registerForAce)
    await this._bootProviders()
    this._defineAliases()
    this._loadPreLoadFiles()
  }

  /**
   * Starts the Adonis http server.
   *
   * @method fireHttpServer
   *
   * @return {void}
   */
  async fireHttpServer (customHttpInstance = null) {
    await this.fire()
    this._startHttpServer()
  }

  /**
   * Runs the ace command
   *
   * @method fireAce
   *
   * @return {void}
   */
  async fireAce () {
    await this.fire(true)
    const ace = require(path.join(this._appRoot), '/node_modules/adonis-ace')
    this._registerCommands(ace)
    ace.invoke(this._packageFile)
  }
}

module.exports = Ignitor
