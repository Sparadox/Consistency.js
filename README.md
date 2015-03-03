Consistency.js : consistent webapps made easy
=============================================

This module is the frontend client for Consistency, a toolkit enabling you to have an Observer paradigm between your frontend and your backend. In one sentence, when a resource is updated on your server (a RAW in the database, the result of a query or anything you want) the parts of your frontend using this resource are automatically updated. The process is **real-time** and lightweight both on the client and server side.

A plugin for django is being written to enable you to use Consistency with almost no modifications to your Django backend. Plugins can be written quickly for other backend frameworks. On the frontend, it lets you use the tool of your choice (plain Javascript written by yourself of course but it also integrates very nicely with React.js or Angular.js).

Still on the frontend side it is possible to write a similar library for Android/iOS to have a consistent native app frontend.

How does it work
----------------

Thanks to websocket, a **bidirectionnal** connection between your backend and your frontend is maintained as long as your page remains open in the browser. Therefore as soon as an update is performed in the backend, your frontend is notified and refreshes the updated resource. 


TODO List
---------

* Complete all the TODO in consistency.js
* Write a getting started guide with a ready-to-go test and experimenting suite.
* API Reference for the few public functions there is (and also private ones, it may help third party developpers to write the iOS/Android client if the wish).
