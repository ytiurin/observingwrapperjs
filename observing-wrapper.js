!function() {

  var observer;

  function declareObservableProperty(observers, observable, propertyName)
  {
    function get() {
      return typeof observable.__originalObject[propertyName] !== 'function' ? 
        observable.__originalObject[propertyName] : 
          function() {
            var args = Array.prototype.slice.call(arguments, 0),
              result = observable.__originalObject[propertyName].apply(observable.__originalObject, args);

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

  function ObservableObject(userObject)
  {
    var observable = this, observers = [];

    this.__originalObject = {};
    this.__addObserver = new Function;

    if (typeof userObject === 'object')
      this.__originalObject = userObject;

    if (Object.defineProperty === undefined) {
      throw 'Object.defineProperty method does not exist. Observable won\'t work.';
      return;
    }

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

    function getDeepPropertyNames(obj)
    {
      var proto = Object.getPrototypeOf(obj), protoPropertyNames = [];
      proto && (protoPropertyNames = getDeepPropertyNames(proto));
      return Object.getOwnPropertyNames(obj).concat(protoPropertyNames);
    }

    getDeepPropertyNames(observable.__originalObject).forEach(
      function(propertyName) {
        declareObservableProperty(observers, observable, propertyName);
      });
  }

  function ObservableArray(userArray)
  {
    var observable = this, observers = [];

    this.__originalArray = [];
    this.__addObserver = new Function;

    if (Object.prototype.toString.call(userArray) === "[object Array]")
      this.__originalArray = userArray;

    if (Object.defineProperty === undefined) {
      throw 'Object.defineProperty method does not exist. Observable won\'t work.';
      return;
    }

    this.__addObserver = function(userObserver) {
      if (observers.indexOf(userObserver) === -1)
        observers.push(userObserver);
    }

    Object.getOwnPropertyNames(Array.prototype).forEach(function(methodName) {
      typeof Array.prototype[methodName] === 'function' && 
        (observable[methodName] = function() {
          var args = Array.prototype.slice.call(arguments, 0),
            result = observable.__originalArray[methodName].apply(observable.
              __originalArray, args);

          observers.forEach(function(observer) {
            observer._notify(observable, [methodName, args, result]);
          });

          return result;
        })
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

    }
  }

  function observingWrapper(userObjectOrObservable, userChangeHandler) {
    var observableObject, userObjectType;

    userObjectType = Object.prototype.toString.call(userObjectOrObservable);

    // var obsleProto;
    // (obsleProto = Object.getPrototypeOf(this)) && console.log(this === obsleProto) &&
    //   (observable = Object.create(new ObservableObject(obsleProto), observable))

    (userObjectOrObservable.__addObserver && (observableObject = 
      userObjectOrObservable)) || (['[object Array]', '[object Object]']
        .indexOf(userObjectType) > -1 && (observableObject = new ({
          '[object Array]': ObservableArray, '[object Object]': ObservableObject
            })[userObjectType](userObjectOrObservable)));

    userChangeHandler && observer.add(observableObject, userChangeHandler);

    return observableObject;
  }

  observer = new Observer;
  observingWrapper.remove = observer.remove;

  window.define && define(function() {return observingWrapper});
  window.define === undefined && (window.observingWrapper = observingWrapper);


  //**************************************************
  !function testMethodsOverride() {
    var obsnObject = new ObservableObject({p:'foo', f: new Function});
    var observer = new Observer;
    var i=-2;

    observer.add(obsnObject, function(propertyName, propertyValue) {
      i++;
    });

    obsnObject.p = 'foo2';
    obsnObject.f('sad', 'asd');
    obsnObject.f='ss';

    if (i === 3)
      document.write('<p style="color:green">Observation works</p>');
    else
      document.write('<p style="color:red">Observation failed</p>');
  }()

  !function testPrototyping() {
    function ff() {this.p1='foo1'}; 
    ff.prototype = {p0:'foo0'};

    var objectWithPrototype = new ff;
    var obsnObject = new ObservableObject(objectWithPrototype);

    if (obsnObject.p0)
      document.write('<p style="color:green">Prototyping works</p>');
    else
      document.write('<p style="color:red">Prototyping failed</p>');
  }()

  !function testArray() {
    var obsnObject = new ObservableObject([]);
    var observer = new Observer;
    var i = 0;
    observer.add(obsnObject, function(methodName, args, result) {
      // console.log(methodName, args);
      if (['push','splice'].indexOf(methodName)>-1 && args[0]===1)
        i++;
    });

    obsnObject.push(1);
    obsnObject.splice(1);

    if (i === 2 && obsnObject.length===1)
      document.write('<p style="color:green">Arrays work</p>');
    else
      document.write('<p style="color:red">Arrays failed</p>');
  }()

  document.close();
}()

//**************************************************
// var someObject = {p1: 'v1', p2: 'v2'},
//     someArray = [1,2,3];

// // observer = new Observer();
// // someObsleObject = new ObservableObject(someObject);
// someObsleObject = observingWrapper(someObject);
// observingWrapper(someObsleObject, function(propertyName, propertyValue) {
//   console.log('Property ' + propertyName + ' new value is \'' + propertyValue + '\'');
// })

// // observer.add(someObsleObject, function(propertyName, propertyValue) {
// //   console.log('Property ' + propertyName + ' new value is \'' + propertyValue + '\'');
// // });

// someObsleObject = observingWrapper(someObject);
// observingWrapper(someObsleObject, function(propertyName, propertyValue) {
//   console.log('Property ' + propertyName + ' new value is \'' + propertyValue + '\'');
// })

// // someObsleArray = new ObservableArray(someArray);

// // observer.add(someObsleArray, function(methodName, args) {
// //   console.log(methodName, args);
// // });

// someObsleArray = observingWrapper(someArray, function(methodName, args) {
//   console.log(methodName, args);
// })
// observingWrapper(someObsleArray, function(propertyName, propertyValue) {
//   console.log('all ok');
// })

// someObsleObject.p1 = 'v3';
// someObsleArray.splice(2, 0);
