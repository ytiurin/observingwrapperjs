/*
 * Observing wrapper v0.4
 * https://github.com/ytiurin/observingwrapperjs
 *
 * Copyright (c) 2014 Yevhen Tiurin
 * Licensed under MIT (https://github.com/ytiurin/observingwrapperjs/blob/master/LICENSE)
 *
 * March 30, 2015
 */

!function(window){

  'use strict';

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
    this.observableKeys={};
    this.changeHandlers=[];
    this.specificHandlers={};

    Object.defineProperty(this.observableKeys,'__observingWrapper',{value:this});
    this.defineObservableProperties();
  }

  ObservingWrapper.getSourceObject = function(obj) {
    if(obj.__observingWrapper)
      return obj.__observingWrapper.sourceObject;
    return obj;
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

    if(userPropertyName!==undefined){
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
      for(key in this.observableKeys)
        typeof this.sourceObject[key]!=='function'&&userChangeHandler.call(this.
          observableKeys,[{name:key,object:this.observableKeys,type:'update',
          oldValue:this.sourceObject[key]}]);
    }
  }

  ObservingWrapper.prototype.defineObservableProperties = function() {
    for(var propertyNames=getDeepPropertyNames(this.sourceObject,this.observableKeys),
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
    
    Object.defineProperty(this.observableKeys, propertyName, {enumerable:isEnum, 
      configurable:true, get:get, set:set});
  }

  ObservingWrapper.prototype.getPropertyValue=function(propertyName){
    var ow=this;
    return typeof this.sourceObject[propertyName]!=='function'
      ? this.sourceObject[propertyName] 
      : function(){
          var
          length=ow.sourceObject.length,
          result=ow.sourceObject[propertyName].apply(ow.sourceObject,arguments);

          if(length&&length!==ow.sourceObject.length)
            ow.undefineObservableProperties(),
            ow.defineObservableProperties();

          ow.notifyObservers([{name:propertyName,object:ow.observableKeys,type:
            'call',arguments:arguments,result:result}]);

          return result;
        };
  }

  ObservingWrapper.prototype.notifyObservers=function(changes){
    var specificHandlers,i,n;
    
    // function reduceArgs(args){
    //   return Array.prototype.slice.call(args,1);
    // }

    if(specificHandlers=this.specificHandlers[changes[0].name])
      for(i=0,n=specificHandlers.length;i<n;i++)
        specificHandlers[i].call(this.observingKeys,changes);

    for(i=0,n=this.changeHandlers.length;i<n;i++)
      this.changeHandlers[i].call(this.observingKeys,changes);
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

    if(userPropertyName!==undefined){
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

  ObservingWrapper.prototype.setPropertyValue=function(propertyName,
    propertyValue){var oldValue;

    if(this.sourceObject[propertyName]!==propertyValue){
      oldValue=this.sourceObject[propertyName];
      this.sourceObject[propertyName]=propertyValue;
      this.notifyObservers([{name:propertyName,object:this.sourceObject,type:
        'update',oldValue:oldValue}]);
    }
  }

  ObservingWrapper.prototype.undefineObservableProperties = function() {
    for(var propertyNames=getDeepPropertyNames(this.observableKeys),i=0,n=
      propertyNames.length; i<n; i++)
      delete this.observableKeys[i];
  }

  function observingWrapper(userObject, userChangeHandler)
  {
    var owInstance=arguments[0]&&arguments[0].__observingWrapper;

    if(!owInstance)
      owInstance=new ObservingWrapper(arguments[0]||{});

    if(arguments[1]!==undefined)
      owInstance.addChangeHandler(arguments[1],arguments[2]);

    return owInstance.observableKeys;
  }

  observingWrapper.__constructor = ObservingWrapper;

  observingWrapper.remove = function(userobservableKeys,userChangeHandler) {
    var ow=userobservableKeys.__observingWrapper;

    if (userChangeHandler)
      ow.removeChangeHandler(userChangeHandler);
    else
      ow.changeHandlers=[];
  };

  window.define && define(function() {return observingWrapper});
  window.define === undefined && (window.observingWrapper = observingWrapper);

}(window)
