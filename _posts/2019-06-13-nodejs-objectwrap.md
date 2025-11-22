---
layout: base.html
title:  "Node JS ObjectWrap"
date:   2019-06-13
---
Find if a nested object exists.


After digging and eventually finding this Stack Overflow post: https://stackoverflow.com/questions/2631001/test-for-existence-of-nested-javascript-object-key  
I decided to write a little test script which I've posted here as example.

Take a look at this example code to see how as a beginner I had a nested if block to see if a nested object existed, and how I'm doing it now using ObjectWrap. 
http://web.archive.org/web/20161108071447/http://blog.osteele.com/posts/2007/12/cheap-monads/

```
var user = {
  name: {
```
first: 'Apple'
```
  }
}

console.log("ugly if");
console.log("");

if (user.hasOwnProperty('name')) {
  console.log("name: " + JSON.stringify(user.name));
  if (user.name.hasOwnProperty('first')) {
```
console.log("first: " + user.name.first);
```
  } else {
```
console.log("first is missing");
```
  }
  if (user.name.hasOwnProperty('last')) {
```
console.log("last: " + user.name.last);
```
  } else {
```
console.log("last is missing");
```
  }
} else {
  console.log("name is missing");
}

console.log("");
console.log("objectwrap");
console.log("");

var name = (user || {}).name;
console.log("name: " + JSON.stringify(name));
var first = ((user || {}).name || {}).first;
console.log("first: " + first);
var last = ((user || {}).name || {}).last;
console.log("last: " + last);
```
