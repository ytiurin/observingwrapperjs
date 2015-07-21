observing-wrapper.js
==================

A data bind booster. Moved to [https://github.com/ytiurin/observing-proxy.js](https://github.com/ytiurin/observing-proxy.js)

##Usage
```javascript
var obj = {p1:'',p2:''};
ow.observe(obj,function(changes){
  console.log(changes)
});
ow(obj).p1='move';
ow(obj).p2='next';
// [{name: 'p1', object: {p1:'move',p2:'next'}, type: 'update', oldValue: ''},
//  {name: 'p2', object: {p1:'move',p2:'next'}, type: 'update', oldValue: ''}]
```

Observe array changes:
```javascript
var arr = [1,2,3];
ow.observe(arr,function(changes){
  console.log(changes)
});
ow(arr).push(4);
ow(arr).splice(1,1);
// [{type: 'splice', object: [1,3,4], index: 3, removed: [], addedCount: 1},
//  {type: 'splice', object: [1,3,4], index: 1, removed: [2], addedCount: 0}]
```

##Note
This is not a polyfill of Object.observe and Array.observe methods though it utilizes the specification of both.
