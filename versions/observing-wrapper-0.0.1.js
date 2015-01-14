/*
 * Observing wrapper v0.0.1
 * https://github.com/ytiurin/observingwrapperjs
 *
 * Copyright (c) 2014 Yevhen Tiurin
 * Licensed under MIT (https://github.com/ytiurin/observingwrapperjs/blob/master/LICENSE)
 *
 * December 1, 2014
 */

!function() {

  var observer;

  !function checkECMAScript51Features()
  {
    ['defineProperty','getPrototypeOf','getOwnPropertyNames'].forEach(
      function(method) {
        if (Object[method] === undefined)
          throw 'Object.'+method+' method does not exist. Observable will not work.';
      });
  }()

  function defineObservableProperty(observers, observable, propertyName)
  {
    function get() {
      return typeof observable.__originalObject[propertyName] !== 'function' ? 
        observable.__originalObject[propertyName] : 
          function() {
            var args = Array.prototype.slice.call(arguments, 0),
              result = observable.__originalObject[propertyName].apply(
                observable.__originalObject, args);

            observable.__defineObservableProperties();

            observers.forEach(function(observer) {
              observer.__notify(observable, [propertyName, args, result]);
            });

            return result;
          };
    }

    function set(userValue) { 
      if (observable.__originalObject[propertyName] !== userValue) {
        observable.__originalObject[propertyName] = userValue;

        observers.forEach(function(observer) {
          observer.__notify(observable, [propertyName, userValue]);
        });
      }

      return observable;
    }

    Object.defineProperty(observable, propertyName, {enumerable : true, 
      configurable : true, get: get, set: set});
  }

  function getDeepPropertyNames(obj)
  {
    var proto = Object.getPrototypeOf(obj), protoPropertyNames = [];
    proto && (protoPropertyNames = getDeepPropertyNames(proto));
    return Object.getOwnPropertyNames(obj).concat(protoPropertyNames);
  }

  function ObservableObject(userObject)
  {
    var observable = this, observers = [], deepPropertyNames = [];

    this.__originalObject = {};

    if (typeof userObject === 'object')
      this.__originalObject = userObject;

    this.__addObserver = function(userObserver, initHandler) {
      if (observers.indexOf(userObserver) === -1)
        observers.push(userObserver);

      Object.getOwnPropertyNames(observable.__originalObject).forEach(
        function(propertyName) {
          initHandler.apply(observable.__originalObject, [propertyName, 
            observable.__originalObject[propertyName]]);
        });
    }

    this.__defineObservableProperties = function() {
      var nDeepPropertyNames = getDeepPropertyNames(observable.__originalObject),
        o = deepPropertyNames.length === nDeepPropertyNames.length && 
          deepPropertyNames.every(function(n, i, arr) {
            return nDeepPropertyNames[i] === n;
          })

      !o && (deepPropertyNames.forEach(function(propertyName) {
          delete observable[propertyName];
        }), nDeepPropertyNames.forEach(function(propertyName) {
          defineObservableProperty(observers, observable, propertyName);
        }), deepPropertyNames = nDeepPropertyNames);
    }

    this.__removeObserver = function(userObserver) {
      var rmInd;
      
      (rmInd = observers.indexOf(userObserver)) > -1 && 
        observers.splice(rmInd, 1);
    }

    this.__defineObservableProperties();
  }

  function Observer()
  {
    var observables = [], changeHandlers = [], observer = this;

    this.__notify = function(userObservable, notifyArguments) {
      var obsleInd = observables.indexOf(userObservable);

      changeHandlers[obsleInd] && 
        changeHandlers[obsleInd].forEach(function(changeHandler) {
          changeHandler.apply(userObservable.__originalObject, notifyArguments);
        });
    }

    this.add = function(userObservable, userChangeHandler) {
      var obsleInd = observables.indexOf(userObservable);

      if (obsleInd > -1) {
        changeHandlers[obsleInd].push(userChangeHandler);
      }
      else {
        observables.push(userObservable);
        changeHandlers.push([userChangeHandler]);
      }

      userObservable.__addObserver(observer, userChangeHandler);
    }

    this.remove = function(userObservable, userChangeHandler) {
      var obsleInd, rmInd;

      if ((obsleInd = observables.indexOf(userObservable)) > -1) {
        if (userChangeHandler) {
          (rmInd = changeHandlers[obsleInd].indexOf(userChangeHandler)) > -1 &&
            changeHandlers[obsleInd].splice(rmInd, 1);
        }
        
        if (!changeHandlers[obsleInd].length) {
          observables.splice(obsleInd, 1);
          changeHandlers.splice(obsleInd, 1);
          userObservable.__removeObserver(observer);
        }
      }
    }
  }

  function observingWrapper(userObjectOrObservable, userChangeHandler)
  {
    var observableObject = userObjectOrObservable && userObjectOrObservable.
      __originalObject ? userObjectOrObservable : new ObservableObject(
        userObjectOrObservable);

    userChangeHandler && observer.add(observableObject, userChangeHandler);

    return observableObject;
  }

  observer = new Observer;
  observingWrapper.remove = observer.remove;
  observingWrapper.__ = {ObservableObject: ObservableObject, Observer: Observer};

  window.define && define(function() {return observingWrapper});
  window.define === undefined && (window.observingWrapper = observingWrapper);

}()
