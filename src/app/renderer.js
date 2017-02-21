'use strict';

// LIBRARIES
import React from 'react';
import ReactDOM from 'react-dom';
import TreeView from './TreeView.jsx';

// EXPORT MODULE
const renderer = {};
module.exports = renderer;

const renderApp = (err, data, init) => {
  if(init){
    ReactDOM.render(<div>   
                      <TreeView />
                    </div>,
                    document.getElementById('tree')
    ); 
    document.getElementById("JSONText").innerHTML = JSON.stringify(data,
                                                                   null,
                                                                   2);
    document.getElementById("updateTree").click();
  }
  else{
    document.getElementById("JSONText").innerHTML = JSON.stringify(data,
                                                                   null,
                                                                   2);
    document.getElementById("updateTree").click();
  }

};

// rendering
renderer.renderApp = renderApp;
