var CreateSignalFactory = require('./CreateSignalFactory.js');
var CreateSignalStore = require('./CreateSignalStore.js');
var CreateRecorder = require('./CreateRecorder.js');
var CreateRegisterModules = require('./CreateRegisterModules.js');
var Devtools = require('./Devtools.js');
var Compute = require('./Compute.js');
var EventEmitter = require('events').EventEmitter;

var Controller = function (Model, services) {

  var controller = new EventEmitter();
  var model = Model(controller);
  var compute = Compute(model);
  var signals = {};
  var devtools = null;
  var signalStore = CreateSignalStore(signals, controller);
  var modules = {};
  services = services || {};

  if (typeof window !== 'undefined' && typeof window.addEventListener !== 'undefined') {
    devtools = Devtools(signalStore, controller);
  }

  var recorder = CreateRecorder(signalStore, signals, controller, model);
  var signalFactory = CreateSignalFactory(signalStore, recorder, devtools, controller, model, services, compute, modules);
  var signal = function () {
    var signalNamePath = arguments[0].split('.');
    var signalName = signalNamePath.pop();
    var signalMethodPath = signals;
    while (signalNamePath.length) {
      var pathName = signalNamePath.shift();
      signalMethodPath = signalMethodPath[pathName] = signalMethodPath[pathName] || {};
    }
    return signalMethodPath[signalName] = signalFactory.apply(null, arguments);
  };

  controller.signal = signal;
  controller.signalSync = function () {
    var defaultOptions = arguments[2] || {};
    defaultOptions.isSync = true;
    return signal.apply(null, [arguments[0], arguments[1], defaultOptions])
  }

  controller.signals = signals;
  controller.services = services;
  controller.store = signalStore;
  controller.recorder = recorder;
  controller.get = function () {
    if (typeof arguments[0] === 'function') {
      return compute.has(arguments[0]) ? compute.getComputedValue(arguments[0]) : compute.register(arguments[0]);
    }
    var path = !arguments.length ? [] : typeof arguments[0] === 'string' ? [].slice.call(arguments) : arguments[0];
    return model.accessors.get(path);
  };
  controller.devtools = devtools;
  controller.logModel = function () {
    return model.logModel();
  };
  controller.recorder = recorder;

  controller.modules = modules;
  controller.registerModules = CreateRegisterModules(controller, model);

  return controller;
};

Controller.ServerController = function (state) {
  var model = {
    accessors: {
      get: function (path) {
        path = path.slice();
        var key = path.pop();
        var grabbedState = state;
        while (path.length) {
          grabbedState = grabbedState[path.shift()];
        }
        return grabbedState[key];
      }
    }
  };
  var compute = Compute(model);

  return {
    isServer: true,
    get: function (path) {
      if (typeof arguments[0] === 'function') {
        return compute.has(arguments[0]) ? compute.getComputedValue(arguments[0]) : compute.register(arguments[0]);
      }
      var path = !arguments.length ? [] : typeof arguments[0] === 'string' ? [].slice.call(arguments) : arguments[0];
      return model.accessors.get(path);
    }
  }
};

module.exports = Controller;
