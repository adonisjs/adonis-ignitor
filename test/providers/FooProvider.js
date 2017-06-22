'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

class FooProvider extends ServiceProvider {
  constructor (ioc) {
    super(ioc)
    this._events = []
  }

  boot () {
    this._events.push('boot')
  }

  register () {
    this._events.push('register')
  }
}

module.exports = FooProvider
