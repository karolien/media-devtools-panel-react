'use strict';

import renderer from './renderer';

var port = chrome.runtime.connect(null, { name : 'panel' });
var tabId = chrome.devtools.inspectedWindow.tabId;

var needInit = true;
port.onMessage.addListener(function(msg) {
  switch (msg.action) {
    case 'got-media-info':
      if (needInit) {
        renderer.renderApp(null, JSON.parse(msg.value), true);
        needInit = false;
      } else {
        renderer.renderApp(null, JSON.parse(msg.value), false);
      }
      break;
  }
});

function post(msg)
{
  msg.tabId = tabId;
  port.postMessage(msg);
}

var refreshRate = 1;
var stopped = true;
function countdown()
{
  if (!stopped) {
    post({ action : 'get-media' });
    setTimeout(countdown, refreshRate * 1000);
  }
}

var autoRefreshOn = true;
var autoRefreshBtn = document.getElementById("autoRefresh");
var rangeInput = document.getElementById("rangeVal");
var manualRefreshBtn = document.getElementById("manualRefresh");

rangeInput.addEventListener('change', function() {
  document.getElementById('rangeValLabel').innerHTML = this.value + 's';
  refreshRate = this.value;
});

autoRefreshBtn.addEventListener("click", function() {
  if (!stopped) {
    autoRefreshBtn.innerHTML = "Start (A)";
    stopped = true;
  } else {
    autoRefreshBtn.innerHTML = "Stop (A)";
    stopped = false;
    countdown();
  }

});

manualRefreshBtn.addEventListener(
  "click", function() { post({ action : 'get-media' }); });

window.addEventListener('keydown', function(event) {
  switch (event.keyCode) {
    case 82: // R
      post({ action : 'get-media' });
      break;
    case 65: // A
      autoRefreshBtn.click();
      break;
  }

});