/*
 * ObservingWrapper.js v0.1
 * https://github.com/ytiurin/observingwrapperjs
 *
 * Copyright (c) 2014 Yevhen Tiurin
 * Licensed under MIT (https://github.com/ytiurin/observingwrapperjs/blob/master/LICENSE)
 *
 * January 3, 2015
 */

!function(window){

  !function checkECMAScript51Features()
  {
    ['defineProperty','getPrototypeOf','getOwnPropertyNames'].forEach(
      function(method) {
        if (Object[method] === undefined)
          throw 'Object.'+method+' method does not exist. ObservingWrapper will not work.';
      });
  }()

  function getDeepPropertyNames(obj)
  {
    var proto,names,protoNames,reduceNames;

    names=Object.getOwnPropertyNames(obj);
    (proto=Object.getPrototypeOf(obj)) && (names=names.concat(
      getDeepPropertyNames(proto)));

    return names;
  }

  function ObservingWrapper(sourceObject,initHandler)
  {
    this.sourceObject=sourceObject||undefined;
    this.observingKeys={};
    this.changeHandlers=[];

    Object.defineProperty(this.observingKeys,'__observingWrapper',{value:this});
    this.defineObservableProperties();
  }

  ObservingWrapper.prototype.addChangeHandler = function(userChangeHandler) {
    this.changeHandlers.indexOf(userChangeHandler) === -1 && this.changeHandlers
      .push(userChangeHandler);

    for(var key in this.observingKeys)
      typeof this.sourceObject[key] !== 'function' &&
      userChangeHandler.call(this.sourceObject,key,this.sourceObject[key]);
  }

  ObservingWrapper.prototype.defineObservableProperties = function() {
    for(var propertyNames=getDeepPropertyNames(this.sourceObject,this.observingKeys),
      i=0,n=propertyNames.length; i<n; i++)
      this.defineObservableProperty(propertyNames[i]);
  }

  ObservingWrapper.prototype.defineObservableProperty = function(propertyName) {
    var ow=this;

    function get() {
      return ow.getPropertyValue(propertyName);
    }

    function set(userValue) {
      ow.setPropertyValue(propertyName, userValue);
    }

    Object.defineProperty(this.observingKeys, propertyName, {enumerable:true, 
      configurable:true, get:get, set:set});
  }

  ObservingWrapper.prototype.getPropertyValue = function(propertyName) {
    var ow=this;
    return typeof this.sourceObject[propertyName] !== 'function' ? this.
      sourceObject[propertyName] : function() {
        var
        length=ow.sourceObject.length,
        result=ow.sourceObject[propertyName].apply(ow.sourceObject,arguments);

        if(length&&length!==ow.sourceObject.length) {
          ow.undefineObservableProperties();
          ow.defineObservableProperties();
        }

        ow.notifyObservers(propertyName, arguments, result);

        return result;
      };
  }

  ObservingWrapper.prototype.notifyObservers = function() {
    for(var i=0,n=this.changeHandlers.length;i<n;i++)
      this.changeHandlers[i].apply(this.sourceObject, arguments);
  }

  ObservingWrapper.prototype.removeChangeHandler = function(userChangeHandler) {
    var rmInd = this.changeHandlers.indexOf(userChangeHandler);
    rmInd > -1 && this.changeHandlers.splice(rmInd,1);
  }

  ObservingWrapper.prototype.setPropertyValue = function(propertyName,propertyValue) {
    if (this.sourceObject[propertyName] !== propertyValue) {
      this.sourceObject[propertyName] = propertyValue;
      this.notifyObservers(propertyName, propertyValue);
    }
  }

  ObservingWrapper.prototype.undefineObservableProperties = function() {
    for(var propertyNames=getDeepPropertyNames(this.observingKeys),i=0,n=
      propertyNames.length; i<n; i++)
      delete this.observingKeys[i];
  }

  function observingWrapper(userObject, userChangeHandler)
  {
    var owInstance = userObject && userObject.__observingWrapper ? userObject.
      __observingWrapper : new ObservingWrapper(userObject);

    userChangeHandler && owInstance.addChangeHandler(userChangeHandler);

    return owInstance.observingKeys;
  }

  observingWrapper.__constructor = ObservingWrapper;

  observingWrapper.remove = function(userObservingKeys,userChangeHandler) {
    userObservingKeys.__observingWrapper.removeChangeHandler(userChangeHandler);
  };

  window.define && define(function() {return observingWrapper});
  window.define === undefined && (window.observingWrapper = observingWrapper);

}(window)
