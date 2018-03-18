<a name="2.0.6"></a>
## [2.0.6](https://github.com/adonisjs/adonis-ignitor/compare/v2.0.5...v2.0.6) (2018-03-18)


### Features

* **ignitor:** expose methods to run the Websocket server along with Http ([a39eb17](https://github.com/adonisjs/adonis-ignitor/commit/a39eb17))
* **Ignitor:** optionally load wsKernel for websocket middleware ([5254f50](https://github.com/adonisjs/adonis-ignitor/commit/5254f50))



<a name="2.0.5"></a>
## [2.0.5](https://github.com/adonisjs/adonis-ignitor/compare/v2.0.4...v2.0.5) (2018-02-08)


### Reverts

* **helpers:** remove the concept of sharing directories ([4b73862](https://github.com/adonisjs/adonis-ignitor/commit/4b73862))



<a name="2.0.4"></a>
## [2.0.4](https://github.com/adonisjs/adonis-ignitor/compare/v2.0.3...v2.0.4) (2018-02-08)


### Features

* **helpers:** helpers now exposes directories ready only property ([b6e2e3c](https://github.com/adonisjs/adonis-ignitor/commit/b6e2e3c))



<a name="2.0.3"></a>
## [2.0.3](https://github.com/adonisjs/adonis-ignitor/compare/v2.0.2...v2.0.3) (2018-02-07)


### Bug Fixes

* **fireAce:** wrap inside try/catch and pretty print errors ([2d1027f](https://github.com/adonisjs/adonis-ignitor/commit/2d1027f))



<a name="2.0.2"></a>
## [2.0.2](https://github.com/adonisjs/adonis-ignitor/compare/v2.0.1...v2.0.2) (2018-02-07)


### Bug Fixes

* **ignitor:** load factory.js during ace command only ([fb3577f](https://github.com/adonisjs/adonis-ignitor/commit/fb3577f)), closes [#8](https://github.com/adonisjs/adonis-ignitor/issues/8)



<a name="2.0.1"></a>
## [2.0.1](https://github.com/adonisjs/adonis-ignitor/compare/v2.0.0...v2.0.1) (2018-02-07)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.14...v2.0.0) (2018-01-31)


### Bug Fixes

* **exitHook:** remove exit-hook and instead listen for SIGTERM only ([a431176](https://github.com/adonisjs/adonis-ignitor/commit/a431176))
* **hooks:** fire before and after aceCommand hooks ([cbc80e5](https://github.com/adonisjs/adonis-ignitor/commit/cbc80e5)), closes [#6](https://github.com/adonisjs/adonis-ignitor/issues/6)
* **ignitor:** call setExceptionHandler over setExceptionsHandler ([5b6d509](https://github.com/adonisjs/adonis-ignitor/commit/5b6d509))
* **ignitor:** do not swallow errors inside preload files ([6e7027d](https://github.com/adonisjs/adonis-ignitor/commit/6e7027d)), closes [#5](https://github.com/adonisjs/adonis-ignitor/issues/5)
* **ignitor:** remove all try/catch checks for file existence ([0f3c055](https://github.com/adonisjs/adonis-ignitor/commit/0f3c055))


### Features

* **ignitor:** show app errors beautifully on terminal ([ab232ec](https://github.com/adonisjs/adonis-ignitor/commit/ab232ec))



<a name="1.0.14"></a>
## [1.0.14](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.13...v1.0.14) (2017-10-31)


### Bug Fixes

* **helpers:** return true from isAceCommand when executed via adonis global ([6117093](https://github.com/adonisjs/adonis-ignitor/commit/6117093)), closes [#3](https://github.com/adonisjs/adonis-ignitor/issues/3)



<a name="1.0.13"></a>
## [1.0.13](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.12...v1.0.13) (2017-10-29)


### Bug Fixes

* **http:** allow end-user to bind custom http instance ([703ef28](https://github.com/adonisjs/adonis-ignitor/commit/703ef28))
* **ignitor:** fix breaking tests ([8d676e4](https://github.com/adonisjs/adonis-ignitor/commit/8d676e4))


### Features

* **http:** add hook to gracefully shutdown server ([26b0684](https://github.com/adonisjs/adonis-ignitor/commit/26b0684))
* **ignitor:** handle `unhandledRejections` ([b6f6d06](https://github.com/adonisjs/adonis-ignitor/commit/b6f6d06)), closes [#1](https://github.com/adonisjs/adonis-ignitor/issues/1)



<a name="1.0.12"></a>
## [1.0.12](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.11...v1.0.12) (2017-10-03)


### Bug Fixes

* **ignitor:** allow preload file path to be absolute ([bb35c48](https://github.com/adonisjs/adonis-ignitor/commit/bb35c48))


### Features

* **autoload:** register all autoload directories from package.json file ([39d9015](https://github.com/adonisjs/adonis-ignitor/commit/39d9015))



<a name="1.0.11"></a>
## [1.0.11](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.10...v1.0.11) (2017-09-14)


### Features

* **ignitor:** switch node env to testing on exec test command ([10ba6bd](https://github.com/adonisjs/adonis-ignitor/commit/10ba6bd))



<a name="1.0.10"></a>
## [1.0.10](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.9...v1.0.10) (2017-08-22)


### Reverts

* **ignitor:** remove port discovery ([bacac68](https://github.com/adonisjs/adonis-ignitor/commit/bacac68))



<a name="1.0.9"></a>
## [1.0.9](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.8...v1.0.9) (2017-08-22)



<a name="1.0.8"></a>
## [1.0.8](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.7...v1.0.8) (2017-08-22)


### Features

* **resolver:** add validators dir to the map ([04deced](https://github.com/adonisjs/adonis-ignitor/commit/04deced))
* **server:** auto discover port when default one is empty ([aab9923](https://github.com/adonisjs/adonis-ignitor/commit/aab9923))



<a name="1.0.7"></a>
## [1.0.7](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.6...v1.0.7) (2017-08-18)


### Features

* **helpers:** return path to file/folder from app root ([79beea5](https://github.com/adonisjs/adonis-ignitor/commit/79beea5))



<a name="1.0.6"></a>
## [1.0.6](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.5...v1.0.6) (2017-08-05)


### Bug Fixes

* **ignitor:** add modelHooks and traits directory ([1dc04f1](https://github.com/adonisjs/adonis-ignitor/commit/1dc04f1))



<a name="1.0.5"></a>
## [1.0.5](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.4...v1.0.5) (2017-08-02)



<a name="1.0.4"></a>
## [1.0.4](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.3...v1.0.4) (2017-07-16)


### Bug Fixes

* **ignitor:** use ace.addCommand to register commands ([75499b3](https://github.com/adonisjs/adonis-ignitor/commit/75499b3))



<a name="1.0.3"></a>
## [1.0.3](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.2...v1.0.3) (2017-07-16)


### Bug Fixes

* **ignitor:** fix ace setup ([1849193](https://github.com/adonisjs/adonis-ignitor/commit/1849193))



<a name="1.0.2"></a>
## [1.0.2](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.1...v1.0.2) (2017-06-23)


### Bug Fixes

* **ignitor:** pass absolute path to ioc.autoload ([dcef63c](https://github.com/adonisjs/adonis-ignitor/commit/dcef63c))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/adonisjs/adonis-ignitor/compare/v1.0.0...v1.0.1) (2017-06-22)



<a name="1.0.0"></a>
# 1.0.0 (2017-06-13)


### Bug Fixes

* **ignitor:** reference fold.use inside startHttp method ([fa46f44](https://github.com/adonisjs/adonis-ignitor/commit/fa46f44))


### Features

* initial commit ([7345017](https://github.com/adonisjs/adonis-ignitor/commit/7345017))
* **helpers:** add promisify method ([7eb61c5](https://github.com/adonisjs/adonis-ignitor/commit/7eb61c5))
* **ignitor:** add support for explicitly loading commands ([88be7df](https://github.com/adonisjs/adonis-ignitor/commit/88be7df))



