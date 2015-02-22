/*
 * Observing wrapper v0.2.2
 * https://github.com/ytiurin/observingwrapperjs
 *
 * Copyright (c) 2015 Yevhen Tiurin
 * Licensed under MIT (https://github.com/ytiurin/observingwrapperjs/blob/master/LICENSE)
 *
 * February 25, 2015
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
    var proto,names,protoNames,reduceNames,i,n;

    names=Object.getOwnPropertyNames(obj);
    for(i=0,n=names.length;i<n;i++)
      if(names[i].indexOf('__')===0&&names[i].lastIndexOf('__')===names[i].length-2){
        names.splice(i,1);
        i--;
        n--;
      }

    (proto=Object.getPrototypeOf(obj)) && (names=names.concat(
      getDeepPropertyNames(proto)));

    return names;
  }

  function ObservingWrapper(sourceObject,initHandler)
  {
    this.sourceObject=sourceObject||undefined;
    this.observingKeys={};
    this.changeHandlers=[];
    this.specificHandlers={};

    Object.defineProperty(this.observingKeys,'__observingWrapper',{value:this});
    this.defineObservableProperties();
  }

  ObservingWrapper.prototype.addChangeHandler=function(){
    var key,userPropertyName,userChangeHandler;

    if(['string','number'].indexOf(typeof arguments[0])>-1 && typeof arguments
      [1]==='function')
    {
      userPropertyName=arguments[0];
      userChangeHandler=arguments[1];
    }
    else
      userChangeHandler=arguments[0];

    if(userPropertyName){
      this.specificHandlers[userPropertyName]||(this.specificHandlers[
        userPropertyName]=[]);
      if(this.specificHandlers[userPropertyName].indexOf(userChangeHandler)===-1)
      {
        this.specificHandlers[userPropertyName].push(userChangeHandler);
        typeof this.sourceObject[userPropertyName]!=='function'&&
          userChangeHandler.call(this.sourceObject,this.sourceObject[
          userPropertyName]);
      }
    }
    else{
      this.changeHandlers.indexOf(userChangeHandler)===-1&&this.changeHandlers
        .push(userChangeHandler);
      for(key in this.observingKeys)
        typeof this.sourceObject[key]!=='function'&&userChangeHandler.call(this.
          sourceObject,key,this.sourceObject[key]);
    }
  }

  ObservingWrapper.prototype.defineObservableProperties = function() {
    for(var propertyNames=getDeepPropertyNames(this.sourceObject,this.observingKeys),
      i=0,n=propertyNames.length; i<n; i++)
      this.defineObservableProperty(propertyNames[i]);
  }

  ObservingWrapper.prototype.defineObservableProperty = function(propertyName) {
    var ow=this,isEnum=typeof this.sourceObject[propertyName]!=='function';

    function get() {
      return ow.getPropertyValue(propertyName);
    }

    function set(userValue) {
      ow.setPropertyValue(propertyName, userValue);
    }
    
    Object.defineProperty(this.observingKeys, propertyName, {enumerable:isEnum, 
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

        ow.notifyObservers(propertyName,arguments,result);

        return result;
      };
  }

  ObservingWrapper.prototype.notifyObservers = function() {
    var specificHandlers,i;
    
    function reduceArgs(args){
      return Array.prototype.slice.call(args,1);
    }

    if(specificHandlers=this.specificHandlers[arguments[0]])
      for(i=0,n=specificHandlers.length;i<n;i++)
        specificHandlers[i].apply(this.sourceObject,reduceArgs(arguments));

    for(i=0,n=this.changeHandlers.length;i<n;i++)
      this.changeHandlers[i].apply(this.sourceObject,arguments);
  }

  ObservingWrapper.prototype.removeChangeHandler = function() {
    var rmInd,key,userPropertyName,userChangeHandler;

    if(['string','number'].indexOf(typeof arguments[0])>-1 && typeof arguments
      [1]==='function')
    {
      userPropertyName=arguments[0];
      userChangeHandler=arguments[1];
    }
    else
      userChangeHandler=arguments[0];

    if(userPropertyName){
      this.specificHandlers[userPropertyName]&&(rmInd=this.specificHandlers[
        userPropertyName].indexOf(userChangeHandler))>-1&&this.specificHandlers[
        userPropertyName].splice(rmInd,1);
    }
    else{
      (rmInd=this.changeHandlers.indexOf(userChangeHandler))>-1&&this.
        changeHandlers.splice(rmInd,1);

      for(key in this.specificHandlers)
        (rmInd=this.specificHandlers[key].indexOf(userChangeHandler))>-1&&this.
          specificHandlers[key].splice(rmInd,1);
    }
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
    var owInstance=arguments[0]&&arguments[0].__observingWrapper;

    if(!owInstance)
      owInstance=new ObservingWrapper(arguments[0]||{});

    if(arguments[1])
      owInstance.addChangeHandler(arguments[1],arguments[2]);

    return owInstance.observingKeys;
  }

  observingWrapper.__constructor = ObservingWrapper;

  observingWrapper.remove = function(userObservingKeys,userChangeHandler) {
    var ow=userObservingKeys.__observingWrapper;

    if (userChangeHandler)
      ow.removeChangeHandler(userChangeHandler);
    else
      ow.changeHandlers=[];
  };

  window.define && define(function() {return observingWrapper});
  window.define === undefined && (window.observingWrapper = observingWrapper);

}(window)
