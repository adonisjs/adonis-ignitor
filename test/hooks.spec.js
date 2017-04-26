'use strict'

/*
 * adonis-ignitor
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const hooks = require('../src/Hooks')

test.group('Hooks', () => {
  test('throw exception when trying to set hook without specifying lifecycle', (assert) => {
    const fn = () => hooks.providersRegistered()
    assert.throw(fn, 'hooks.providersRegistered is not a function')
  })

  test('throw when calling invalid hook method', (assert) => {
    const fn = () => hooks.before.foo()
    assert.throw(fn, 'hooks.before.foo is not a function')
  })

  test('register before hook', (assert) => {
    const fn = function () {}
    hooks.before.providersRegistered(fn)
    assert.deepEqual(hooks.before.hooks.providersRegistered, [fn])
  })

  test('register after hook', (assert) => {
    const fn = function () {}
    hooks.after.providersRegistered(fn)
    assert.deepEqual(hooks.after.hooks.providersRegistered, [fn])
  })
})
