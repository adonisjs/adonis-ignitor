'use strict'

/*
 * adonis-ignitor
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const validHooks = ['providersRegistered', 'providersBooted', 'preloading', 'httpServer', 'aceCommand']

/**
 * Hooks class is used to register hooks
 *
 * @class Hooks
 */
class Hooks {
  constructor () {
    this._instantiate()
  }

  /**
   * Reference to registered hooks
   *
   * @attribute hooks
   *
   * @return {Object}
   */
  get hooks () {
    return this._hooks
  }

  /**
   * Returns an array of registered hooks for
   * a given event. If no hooks are registered
   * an empty is returned
   *
   * @method get
   *
   * @param  {String} name
   *
   * @return {Array}
   */
  get (name) {
    return this._hooks[name] || []
  }

  /**
   * Set _hooks property on the class instance
   *
   * @method _instantiate
   *
   * @return {void}
   *
   * @private
   */
  _instantiate () {
    this._hooks = {}
  }

  /**
   * Clear all registered hooks by redefining _hooks
   * private property
   *
   * @method clear
   *
   * @return {void}
   */
  clear () {
    this._instantiate()
  }
}

/**
 * Add methods to the Hooks prototype for the valid hooks
 */
validHooks.forEach((hook) => {
  Hooks.prototype[hook] = function (fn) {
    this._hooks[hook] = this._hooks[hook] || []
    this._hooks[hook].push(fn)
    return this
  }
})

/**
 * Exporting an object with before and after
 * hooks.
 *
 * @type {Object}
 */
module.exports = {
  before: new Hooks(),
  after: new Hooks()
}
