chrome.devtools.panels.create("Media", "images/icon-128.png", "panel.html");

var port = chrome.runtime.connect(null, { name : `devtools` });
var tabId = chrome.devtools.inspectedWindow.tabId;

function post(msg) {
  msg.tabId = tabId;
  port.postMessage(msg);
}

port.onDisconnect.addListener(function() {
  // console.log('disconnect');
});

port.onMessage.addListener(function(msg) {
  switch (msg.action) {
    // TODO
  }
});