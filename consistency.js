/**************************************************************************************************
 *
 * Consistency.js library
 *
 * Author : Etienne LAFARGE (etienne.lafarge@gmail.com)
 *
 *
 * Compatibility & Requirements
 * ------------------------------------------------------------------------------------------------
 * Since it make extensive use of XHR 2 Consistency.js is not compatible with IE9 and below. Also,
 * it's not compatible with IE9 and below because it uses WebSockets. Finally, we also use 
 * Object.create... bye bye IE 9 and older. 
 *
 * There is no specific requirements, no library to load, nothing in particular. This being said, 
 * if you need compatibility with IE9 and below, you'll have to load some JS Polyfills for it :)
 *
 *
 * Description
 * ------------------------------------------------------------------------------------------------
 *
 * Consistency is a very light framework providing a generic (but adapted to most use 
 * cases) way to keep your frontend in sync with your backend. You have to install the consistency 
 * server on your machine. If you use Django, adapting your backend is very straightforward (almost 
 * works out of the box actually), please refer to django-consistency plugin. 
 *
 * This is the client side part of the framework. 
 *
 * How does it work ? 
 *
 * You have to declare one or several resources (an entity or list of entities on your server
 * probably, but it can work with any object living in your server anyway. When these resources 
 * are modified on your server, Consistency.js gets notified and an event is triggered. You can
 * catch it with one or several callbacks and refresh your frontend accordingly.
 *
 * The communication with the server is handled through WebSockets. Server it is bidirectionnal : 
 * the server really tells your page something changed (and even better, it tells it what has 
 * changed !) as soon as it has been changed. Therefore it requires no trick such as frequently 
 * asking the backend for changes which can reduce the number of requests sent to your server by a 
 * lot. It also provide a nice way to manage list of resources and paginated list of resources. 
 * Basically the improvement is that if the server tells you a list has changed (which basically 
 * means that an element has been pushed in most cases) and if your backend provides such 
 * functionnality, it will retrieve the new element(s) only instead of reloading the whole list. 
 *
 * TODO make it happen : 
 * This technique is based on the fact that elements are stored in the database with ascending ids.
 * So we will retrieve only the elements whose ids are higher than the highest of the ids of the 
 * elements displayed in your list. If you don't use ascending ids, forget about this technique. 
 * In case there is not such an element (which means an element has been popped) then the whole 
 * list is reloaded)
 *
 * Among others, consistency.js plays very nicely with React.js
 * Also, it's better if your server provides data through a REST API, though it's not required
 *
 * Have fun !
 *
 * Sparadox
 *
 * TODO List : 
 *  - have two list : boundResources and unboundResource so that we can try to rebind the unbound 
 *  resource after a certain timeout (some WebSocket sends may fail after all...)
 *  - have the possibility to use a callback function instead of listeners
 *  - check if this has an onDataUpdate method (enables creating Resources by adding a method to 
 *  the original Resource object
 *
 *************************************************************************************************/

// All the library is held under the CONSISTENCY namespace
var CONSISTENCY = CONSISTENCY || {};

/**
 * Class Client : main class of the application
 */
CONSISTENCY.Client = function(){
    this.resources = {};
    this.consistencyServer = null;
    this.consistencyServerPort = null;
    this.websocketHandle = null;
    this.error = false;
}

// Calling it will start the Websocket connection
CONSISTENCY.Client.prototype.start = function(consistency_server, consistency_server_port){
    this.consistencyServer = consistency_server;
    this.consistencyServerPort = consistency_server_port;

    this.webSocketHandle = new WebSocket("ws://" + this.consistencyServer + ":" + this.consistencyServerPort);

    this.webSocketHandle.onopen = this.onWSOpen.bind(this);
    this.webSocketHandle.onclose = this.onWSClose.bind(this);
    this.webSocketHandle.onmessage = this.onWSMessage.bind(this);
    this.webSocketHandle.onerror = this.onWSError.bind(this);
}

CONSISTENCY.Client.prototype.stop = function(){
    if(this.isBound)
        this.webSocketHandle.close();
}

////////// WebSocket event handlers //////////

CONSISTENCY.Client.prototype.onWSOpen = function(e){
    // Let's (re)bind all our resources first
    for(var uri in this.resources){
        if(this.resources.hasOwnProperty(uri)){
            this.bindResource(this.resources[uri]);
        }
    }


    // TODO : notify observers that the WebSocket connection is up and running
    
    // If we are just recovering from a connection failure we notify that things went back to 
    // normal
    if(this.error){
        console.error("CONSISTENCY : connection with consistency's web server is up again.");
        this.error = false;
    }

    console.info("CONSISTENCY : synchronization turned on.");
}

CONSISTENCY.Client.prototype.onWSClose = function(e){
    // TODO : notify observers that the WS connection has been closed
    // TODO : mark all resources unwatched
    
    console.info("CONSISTENCY : synchronization turned off.");
}

CONSISTENCY.Client.prototype.onWSMessage = function(e){
    // TODO : handle watched messages (so that the client can hive the user visual feedback about
    // data being in sync or not)
    
    data = JSON.parse(e.data);

    switch(data.message){
        case "invalidate":
            resource = this.getResource(data.data.uri);
            if (resource != null)
                resource.fetchResource();
            else
                console.log("Consistency server told us to refresh " + data.data.uri + " but we don't have it. There should be a mistake somewhere.");
            break;
    }

}

CONSISTENCY.Client.prototype.onWSError = function(e){
    console.error("CONSISTENCY : connection with consistency's web server is down.");
    this.error = true;
}

/////////////////////////////////////////////

CONSISTENCY.Client.prototype.bindResource = function(resource){
    this.webSocketHandle.send('{"message": "watch", "data":{"uri": "' + resource.uri + '"}}');

}

CONSISTENCY.Client.prototype.addResource = function(resource){
    // We don't check if the resource is already there since it's already done in the Resource 
    // constructor and it's the only place where addResource gets called (consider that 
    // addResource is private)
    if(this.isBound())
        this.bindResource(resource);
    
    this.resources[resource.uri] = resource;
}

CONSISTENCY.Client.prototype.getResource = function(uri){
    for(var u in this.resources){
        if(this.resources.hasOwnProperty(u)){
            if(u == uri)
                return this.resources[u];
        }
    }

    return null;
}

CONSISTENCY.Client.prototype.removeResource = function(resource){
    if(typeof resource === "string")
        uri = resource;
    else
        uri = resource.uri;

    if(resource in this.resources){
        if(this.isBound()){
            this.webSocketHandle.send('{"message": "unwatch", "data":{"uri": "' + resource.uri + '"}}');
            delete this.resources[resource];
        } else {
            delete this.resources[resource];
        }
    }
}

CONSISTENCY.Client.prototype.isBound = function(){
    return this.webSocketHandle != null && this.webSocketHandle.readyState == WebSocket.OPEN;
}

// Having a single client per page is the recommended behaviour so we create it here
// Though an architecture with multiple client is definitely possible.
CONSISTENCY.client = new CONSISTENCY.Client();

/**
 * Class Resource
 */

CONSISTENCY.Resource = function(url, uri, initialData, xhrDataType, client){
    // If the resource already exists we just return it
    if(!client)
        client = CONSISTENCY.client;

    // If the resource is already registered in the client (same URI) we just return it
    var preexistingResource = client.getResource(uri);
    if(preexistingResource != null)
        return preexistingResource;

    // Otherwise we construct the Resource object from scratch
    this.url = url;
    if(uri)
        this.uri = uri;
    else
        this.uri = url;

    if(xhrDataType)
        this.xhrDataType = xhrDataType;
    else
        this.xhrDataType = null;

    this.observers = [];

    this.xhrHandler = null;

    // Finally we  add the newly created resource to the consistency client so that it keeps in 
    // sync with the backend
    client.addResource(this);

    // If the no initial data is provided we go fetch it
    if(!this.initialData){
        this.data = null;
        this.fetchResource();
    } else
        this.setData(initialData);
    
}

CONSISTENCY.Resource.prototype.fetchResource = function(){
    // TODO : Handle the case where XHR is busy by aborting the previous request
    
    this.xhrHandler = new XMLHttpRequest();

    this.xhrHandler.open('GET', this.url);

    if(this.xhrDataType != null)
        this.xhrHandler.responseType = this.xhrDataType;
    
    this.xhrHandler.addEventListener('loadend', this.onDataLoaded.bind(this), false);
    this.xhrHandler.addEventListener('error', this.onXHRError.bind(this), false);
    this.xhrHandler.addEventListener('abort', this.onXHRAbortion.bind(this), false);

    this.xhrHandler.send(null);
}

///////////// XHR 2 event listeners //////////////

CONSISTENCY.Resource.prototype.onDataLoaded = function(evt){
    if(this.xhrHandler.status == 200){
        this.setData(this.xhrHandler.response);
    } else {
        // TODO : handle this better. Maybe the resource has been deleted. So maybe we can actually
        // give the user the ability to give us a callback in case it happens. He can then prompt
        // "resource doesn't exist" if this.data was null before or resource deleted if it wasn't
        console.error("CONSISTENCY : Request to " + this.url + " returned with status code " + this.xhrHandler.status + ". Maybe there's something wrong in your backend");
    }
}

// TODO : better error handling

CONSISTENCY.Resource.prototype.onXHRError = function(evt){
    console.error("CONSISTENCY : XHR error handling GET Request for resource under " + this.url + " .");
}

CONSISTENCY.Resource.prototype.onXHRAbortion = function(evt){
    console.info("CONSISTENCY : XHR Request on " + this.url + " has been aborted for Consistency has been notified that a newer version has just been put on the server.");
}

/////////////////////////////////////////////////

CONSISTENCY.Resource.prototype.updateListeners = function(newData){
    for(var i=0; i < this.observers.length; i++)
        this.observers[i].onDataUpdate(this.data);
}

CONSISTENCY.Resource.prototype.addUpdateListener = function(o){
    if(typeof o.onDataUpdate !== "function")
        throw new TypeError("Listener " + o + " doesn't implement an onDataUpdate method."); 

    this.observers.push(o);
}

CONSISTENCY.Resource.prototype.removeUpdateListener = function(o){
    i = this.observers.indexOf(o);

    if(typeof o.onDataUpdate !== "function")
        throw new TypeError("Listener " + o + " isn't a listener of " + this + "."); 

    if(i != -1)
        this.observers.splice(i, 1);
}

CONSISTENCY.Resource.prototype.setData = function(data){
    this.data = data;
    this.updateListeners();
}

/**
 * Class JSONResource
 *
 * A resource for which the data is JSON
 */

CONSISTENCY.JSONResource = function(){}

CONSISTENCY.JSONResource.prototype = Object.create(CONSISTENCY.Resource.prototype);
CONSISTENCY.JSONResource.prototype.constructor = CONSISTENCY.JSONResource;

CONSISTENCY.JSONResource.prototype.setData = function(data){
    this.data = JSON.parse(data);
    this.updateListeners();
}

