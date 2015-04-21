/*
 * Observing wrapper v0.4
 * https://github.com/ytiurin/observingwrapperjs
 *
 * Copyright (c) 2014 Yevhen Tiurin
 * Licensed under MIT (https://github.com/ytiurin/observingwrapperjs/blob/master/LICENSE)
 *
 * April 21, 2015
 */
'use strict';

!function(window){

  !function checkECMAScript51Features()
  {
    ['defineProperty','getPrototypeOf','getOwnPropertyNames'].forEach(
      function(method) {
        if (Object[method] === undefined)
          throw 'Object.'+method+' method does not exist. ObservingWrapper will not work.';
      });
  }()
    
  function cropArgs(args,n)
  {
    return Array.prototype.slice.call(args,n);
  }

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

  function ObservingWrapper(sourceObject)
  {
    this.sourceObject=sourceObject||undefined;
    this.observableKeys={};
    this.changeHandlers=[];
    this.changes=[];

    Object.defineProperty(this.observableKeys,'__observingWrapper',{value:this});
    this.defineObservableProperties();
  }

  ObservingWrapper.prototype.addChangeHandler=function(userChangeHandler,
    callOnInit){

    this.changeHandlers.indexOf(userChangeHandler)===-1&&this.changeHandlers
      .push(userChangeHandler);

    if(callOnInit||false)
      for(var key in this.observableKeys)
        typeof this.sourceObject[key]!=='function'&&userChangeHandler.call(this.
          observableKeys,[{name:key,object:this.observableKeys,type:'update',
          oldValue:this.sourceObject[key]}]);
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
      : function(){var len,res,change,so;

          len=ow.sourceObject.length,
          res=ow.sourceObject[propertyName].apply(ow.sourceObject,arguments);

          if(len&&len!==ow.sourceObject.length)
            ow.undefineObservableProperties(),
            ow.defineObservableProperties();

          so=ow.sourceObject;
          change={name:propertyName,object:so,type:'call',arguments:arguments,
            result:res};
          
          if(propertyName==='push')
            change={object:so,type:'splice',index:ow.sourceObject.length-1,
              removed:[],addedCount:1};
          
          else if(propertyName==='splice')
            change={object:so,type:'splice',index:arguments[0],removed:res,
              addedCount:cropArgs(arguments,2).length};

          ow.changes.push(change);
          setTimeout(function(){ow.notifyObservers()});

          return res;
        };
  }

  ObservingWrapper.prototype.notifyObservers=function(){
    var changes=this.changes.splice(0,this.changes.length);

    if(changes.length)
      for(var i=0;i<this.changeHandlers.length;i++)
        this.changeHandlers[i].call(this.observableKeys,changes);
  }

  ObservingWrapper.prototype.removeChangeHandler=function(userChangeHandler){
    var rmInd=this.changeHandlers.indexOf(userChangeHandler);
    
    rmInd>-1&&this.changeHandlers.splice(rmInd,1);
  }

  ObservingWrapper.prototype.setPropertyValue=function(propertyName,
    propertyValue){

    if(this.sourceObject[propertyName]!==propertyValue){
      var oldValue=this.sourceObject[propertyName];
      this.sourceObject[propertyName]=propertyValue;
      this.changes.push({name:propertyName,object:this.sourceObject,type:
        'update',oldValue:oldValue});
      var ow=this;
      setTimeout(function(){ow.notifyObservers()});
    }
  }

  ObservingWrapper.prototype.undefineObservableProperties = function() {
    for(var propertyNames=getDeepPropertyNames(this.observableKeys),i=0,n=
      propertyNames.length; i<n; i++)
      delete this.observableKeys[i];
  }

  function observingWrapper(obj,handler,callOnInit)
  {
    var objWrapper;

    if(obj.observableKeys)
      objWrapper=obj;
    else
      for(var i=0;i<this.wrappers.length;i++)
        if(this.wrappers[i].sourceObject===obj){
          objWrapper=this.wrappers[i];
          break;
        }

    if(!objWrapper)
      this.wrappers.push(objWrapper=new ObservingWrapper(obj));

    if(handler)
      objWrapper.addChangeHandler(handler,callOnInit);

    return objWrapper.observableKeys;
  }

  function observingInstance()
  {
    this.wrappers=[];

    var ow=observingWrapper.bind(this);
    ow.__ObservingWrapper=ObservingWrapper;

    return ow;
  }


  if(window.define)
    window.define(function() {return new observingInstance()});
  else
    window.ow=new observingInstance();


}(window)
