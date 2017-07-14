const http = require('http');
const url = require('url');
const request = require('request');

const Hs100Api = require('hs100-api');
const client = new Hs100Api.Client({typeFilter:'IOT.SMARTPLUGSWITCH', discoveryInterval:1800000});

DEVICES = {};

// Look for plugs, add to list
client.startDiscovery().on('plug-new', (plug) => {
  plug.getSysInfo().then(function(sysInfo){
    DEVICES[sysInfo.alias] = plug;
  });
});

var server = http.createServer( function(req, res) {
  res.writeHead(200, {'content-type': 'application/json;charset=utf-8'});
  var parsedRequest = url.parse(req.url, true);
  var apiCallParts = parsedRequest.path.split("/");
  switch (apiCallParts[1]) {
    case "getstate":
      getState(apiCallParts, res);
      break;
    case "setstate":
      setState(apiCallParts, res);
      break;
    default:
      var response = {status:"INCORRECT CALL"};
      res.end(JSON.stringify(response));
  }
}).listen(8081);

function setState(pathComponents, res) {
  if (pathComponents[2] === undefined) {
    var response = {SUCCESS:"false", MESSAGE:"Plug name undefined"};
    res.end(JSON.stringify(response));
  } else if (pathComponents[3] === undefined) {
    var response = {SUCCESS:"false", MESSAGE:"State to set undefined"};
    res.end(JSON.stringify(response));
  } else {
      var plugName = decodeURIComponent(pathComponents[2]);
      if (DEVICES.hasOwnProperty(plugName)) {
        var powerState = null;
        if (pathComponents[3] == "on") {
          powerState = true;
        } else if (pathComponents[3] == "off") {
          powerState = false;
        }
        if (powerState === null) {
          var  response = {SUCCESS:"false", MESSAGE:"Invalid power state. Please specify 'on' or 'off'"};
          res.end(JSON.stringify(response));
        } else {
          DEVICES[plugName].setPowerState(powerState);
          var response = {SUCCESS:"true", device:plugName, state:pathComponents[3]};
          res.end(JSON.stringify(response));
        }
      }
  }    
}

function getState(pathComponents, res) {
  if (pathComponents[2] !== undefined) { 
    var plugName = decodeURIComponent(pathComponents[2]);
    if (DEVICES.hasOwnProperty(plugName)) {
      DEVICES[plugName].getPowerState().then(function(state) {
        var response = {SUCCESS:"true", plug_state:(state ? "ON":"OFF")};
        res.end(JSON.stringify(response));
      });
    } else {  
      var response = {SUCCESS:"false", MESSAGE:"Plug name undefined"};
      res.end(JSON.stringify(response));
    }
  } else {
    var response = {SUCCESS:"false", MESSAGE:"No plug of specified name"};
    res.end(JSON.stringify(response));
  }
}
