'use strict'

const { ServiceProvider } = require('adonis-fold')

class FooProvider extends ServiceProvider {
  constructor (ioc) {
    super(ioc)
    this._events = []
  }

  boot () {
    return new Promise((resolve) => {
      setTimeout(() => {
        this._events.push('boot')
        resolve()
      }, 200)
    })
  }

  register () {
    this._events.push('register')
  }
}

module.exports = FooProvider
