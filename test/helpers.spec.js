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
const fs = require('fs')
const path = require('path')

const Helpers = require('../src/Helpers')

test.group('Helpers', (group) => {
  group.beforeEach(() => {
    this.helpers = new Helpers(path.join(__dirname, './'))
  })

  test('return path to app root', (assert) => {
    assert.equal(this.helpers.appRoot(), path.join(__dirname, './'))
  })

  test('return path to file from app root', (assert) => {
    assert.equal(this.helpers.appRoot('content'), path.join(__dirname, '/content'))
  })

  test('return path to public dir', (assert) => {
    assert.equal(this.helpers.publicPath(), path.join(__dirname, './public'))
  })

  test('return path to config dir', (assert) => {
    assert.equal(this.helpers.configPath(), path.join(__dirname, './config'))
  })

  test('throw error when trying to access file inside config dir', (assert) => {
    const fn = () => this.helpers.configPath('app')
    assert.throw(fn, 'You should never read a config file from the config directory and instead use config provider')
  })

  test('return false when process has not been started with ace', (assert) => {
    assert.isFalse(this.helpers.isAceCommand())
  })

  test('return path to a file inside public dir', (assert) => {
    assert.equal(this.helpers.publicPath('style.css'), path.join(__dirname, './public/style.css'))
  })

  test('return path to resources dir', (assert) => {
    assert.equal(this.helpers.resourcesPath(), path.join(__dirname, './resources'))
  })

  test('return path to a file inside resources dir', (assert) => {
    assert.equal(this.helpers.resourcesPath('assets/style.scss'), path.join(__dirname, './resources/assets/style.scss'))
  })

  test('return path to views dir', (assert) => {
    assert.equal(this.helpers.viewsPath(), path.join(__dirname, './resources/views'))
  })

  test('return path to a file inside views dir', (assert) => {
    assert.equal(this.helpers.viewsPath('master.edge'), path.join(__dirname, './resources/views/master.edge'))
  })

  test('return path to database dir', (assert) => {
    assert.equal(this.helpers.databasePath(), path.join(__dirname, './database'))
  })

  test('return path to a file inside database dir', (assert) => {
    assert.equal(this.helpers.databasePath('database.sqlite3'), path.join(__dirname, './database/database.sqlite3'))
  })

  test('return path to migrations dir', (assert) => {
    assert.equal(this.helpers.migrationsPath(), path.join(__dirname, './database/migrations'))
  })

  test('return path to a file inside migrations dir', (assert) => {
    assert.equal(this.helpers.migrationsPath('foo.js'), path.join(__dirname, './database/migrations/foo.js'))
  })

  test('return path to seeds dir', (assert) => {
    assert.equal(this.helpers.seedsPath(), path.join(__dirname, './database/seeds'))
  })

  test('return path to a file inside seeds dir', (assert) => {
    assert.equal(this.helpers.seedsPath('foo.js'), path.join(__dirname, './database/seeds/foo.js'))
  })

  test('return path to tmp dir', (assert) => {
    assert.equal(this.helpers.tmpPath(), path.join(__dirname, './tmp'))
  })

  test('return path to a file inside tmp dir', (assert) => {
    assert.equal(this.helpers.tmpPath('logs.txt'), path.join(__dirname, './tmp/logs.txt'))
  })

  test('promisify a function', async (assert) => {
    const packageFile = await this.helpers.promisify(fs.readFile)(path.join(__dirname, '../package.json'))
    assert.equal(JSON.parse(packageFile).name, '@adonisjs/ignitor')
  })
})
