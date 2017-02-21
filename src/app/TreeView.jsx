import React, { Component } from 'react';
import _ from 'lodash';
import{ JsonTree } from 'react-editable-json-tree';

class TreeView extends Component
{
  constructor(props)
  {
    super(props);
    this.state = {
      json : {},
      textareaRef : null,
    };
    this.refTextarea = this.refTextarea.bind(this);
    this.updateTree = this.updateTree.bind(this);
  }

  refTextarea(node) { this.state.textareaRef = node; }

  updateTree()
  {
    const { textareaRef } = this.state;
    // Get data
    const jsonString = textareaRef.innerHTML;

    try {
      const json = JSON.parse(jsonString);
      this.setState({
        json,
      });
    } catch (e) {
      console.error(e);
    }
  }

  render()
  {
    const { json } = this.state;

    const updateBtnStyle = {
      display : 'none',
    };

    return (
      <div>
        <JsonTree data = { json }
                  readOnly = { true }
                  isCollapsed = { (keyPath, deep) => (deep == 2) }
                  rootName = { "Media Info" } />
        <pre id = "JSONText" ref = { this.refTextarea } />
        <button id = "updateTree"
                onClick = { this.updateTree }
                style = { updateBtnStyle } />
      </ div>
    );
  }
}

export default TreeView;
