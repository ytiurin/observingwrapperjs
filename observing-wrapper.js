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

  function declareObservableProperty(observers, observable, propertyName)
  {
    function get() {
      return typeof observable.__originalObject[propertyName] !== 'function' ? 
        observable.__originalObject[propertyName] : 
          function() {
            var args = Array.prototype.slice.call(arguments, 0),
              result = observable.__originalObject[propertyName].apply(
                observable.__originalObject, args);

            observers.forEach(function(observer) {
              observer._notify(observable, [propertyName, args, result]);
            });

            return result;
          };
    }

    function set(userValue) { 
      if (observable.__originalObject[propertyName] !== userValue) {
        observable.__originalObject[propertyName] = userValue;

        observers.forEach(function(observer) {
          observer._notify(observable, [propertyName, userValue]);
        });
      }

      return observable;
    }

    Object.defineProperty(observable, propertyName,
      {enumerable : true, configurable : true, get: get, set: set});
  }

  function getDeepPropertyNames(obj)
  {
    var proto = Object.getPrototypeOf(obj), protoPropertyNames = [];
    proto && (protoPropertyNames = getDeepPropertyNames(proto));
    return Object.getOwnPropertyNames(obj).concat(protoPropertyNames);
  }

  function ObservableObject(userObject)
  {
    var observable = this, observers = [];

    this.__originalObject = {};
    this.__addObserver = new Function;

    if (typeof userObject === 'object')
      this.__originalObject = userObject;

    this.__addObserver = function(userObserver) {
      if (observers.indexOf(userObserver) === -1) {
        observers.push(userObserver);

        Object.getOwnPropertyNames(observable.__originalObject).forEach(
          function(propertyName) {
            userObserver._notify(observable, 
              [propertyName, observable.__originalObject[propertyName]]);
          });
      }
    }

    getDeepPropertyNames(observable.__originalObject).forEach(
      function(propertyName) {
        declareObservableProperty(observers, observable, propertyName);
      });
  }

  function Observer()
  {
    var observables = [], changeHandlers = [];

    this._notify = function(userObservable, notifyArguments) {
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

      userObservable.__addObserver(this);
    }

    this.remove = function(userObservable, userChangeHandler) {
      var obsleInd = observables.indexOf(userObservable);

      if (obsleInd > -1) 
        if (userChangeHandler) {
          var changeHandlerInd = changeHandlers[obsleInd].indexOf(
            userChangeHandler);

          changeHandlerInd > -1 && (changeHandlers[obsleInd][changeHandlerInd] =
            changeHandlers[obsleInd].splice(changeHandlerInd, 1));
        }
        else {
          changeHandlers[obsleInd] = []
        }
    }
  }

  function observingWrapper(userObjectOrObservable, userChangeHandler)
  {
    var observableObject, userObjectType;

    userObjectType = Object.prototype.toString.call(userObjectOrObservable);

    observableObject = userObjectOrObservable.__addObserver ? 
      userObjectOrObservable : new ObservableObject(userObjectOrObservable);

    userChangeHandler && observer.add(observableObject, userChangeHandler);

    return observableObject;
  }

  observer = new Observer;
  observingWrapper.remove = observer.remove;
  observingWrapper.__ = {ObservableObject: ObservableObject, Observer: Observer};

  window.define && define(function() {return observingWrapper});
  window.define === undefined && (window.observingWrapper = observingWrapper);

}()
