'use strict';

// LIBRARIES
import React from 'react';
import ReactDOM from 'react-dom';
import ReactJson from 'react-json-view';
import { AutoSizer, Column, Table } from 'react-virtualized';

function beautifyMessages(messages, objects) {
  return messages.map(function(message) {
    const objectName = objects[message.ob].cls + "#" + message.ob.toString();
    const category = message.cat;
    const label = message.lbl || "";
    const value = message.hasOwnProperty('val') ? (message.val) : "";

    const valueString =(
      value
      ? (((category === "dcon" ||
           category === "link" ||
           category === "ulnk") &&
          typeof value === "number")
         ? (objects[value].cls + "#" + value.toString())
         : (value.toString()))
      : "");

    return {i: message.i, ts: message.ts, ob:objectName, cat: category, lbl: label, val: valueString};
  });
}

// Takes the incoming data and formats it:
// [ {id:0, name:"...", state:{non-log data}, log:{messages:[...], objects:{...}}} ]
// and combines it with the previous analyzed data structure.
function analyzeData(prevData, data)
{
  let start = Date.now();

  let before = prevData.length;
  console.log(`before: ${before}`);
  let reusedWithLog = 0;
  let reusedWithoutLog = 0;
  let created = 0;
  let logLengths = 0;

  let out = prevData.slice();
  data = data || [];

  // Mark previous mediaElements dead, until we reuse them below.
  for (let iOME = 0; iOME < prevData.length; ++iOME) {
    prevData[iOME].alive = false;
  }

  for (let doc of data) {
    let url = doc.url;

    let mediaElements = doc.mediaElements || [];
    for (let iME = 0; iME < mediaElements.length; ++iME) {
      let mediaElement = mediaElements[iME];

      let debugLog = {};
      try {
        if (mediaElement.debugLogJSON !== undefined) {
          let debugLogJSON = mediaElement.debugLogJSON || "{}";
          logLengths += debugLogJSON.length;
          debugLog = JSON.parse(debugLogJSON);
          // Remove debugLogJSON from mediaElement, so it doesn't appear in the JSON tree.
          delete mediaElement.debugLogJSON;
        }
      } catch (err) {
        console.log("Error '" + err.toString() + "' in JSON.parse(debugLogJSON='" + (mediaElement.debugLogJSON || "{}") + "')");
      }

      const objects = debugLog.objects || {};

      // Object number "1" should be the HTMLMediaElement, use its pointer and
      // construction timestamp to uniquely identify the element.
      const logId = objects["1"] ? (objects["1"].ptr + "@" + objects["1"].con_ts.toString()) : "";

      // Find the same element in the previous data.
      let oldMediaElement = null;
      // Try to find by logId first.
      if (logId) {
        for (let iOME = 0; iOME < prevData.length; ++iOME) {
          let oldME = prevData[iOME];
          if (!oldME.alive && oldME.logId === logId) {
            oldMediaElement = oldME;
            break;
          }
        }
      }
      // Didn't find by logId, try by currentSrc.
      if (oldMediaElement === null && mediaElement.HTMLMediaElement.currentSrc) {
        for (let iOME = 0; iOME < prevData.length; ++iOME) {
          let oldME = prevData[iOME];
          if (!oldME.alive && oldME.state.HTMLMediaElement.currentSrc ===
               mediaElement.HTMLMediaElement.currentSrc) {
            oldMediaElement = oldME;
            // Find it by currentSrc, update logId.
            oldMediaElement.logId = logId;
            break;
          }
        }
      }

      if (oldMediaElement === null) {
        // Didn't find -> Must be new!
        created++;
        // The display name is the currentSrc, otherwise the logId, otherwise
        // url+index.
        const index = out.length;
        const name = mediaElement.HTMLMediaElement.currentSrc ||
                     logId ||
                     (url + "#" + index.toString());
        let messages = debugLog.messages || [];
        messages.sort((a,b) => a.i < b.i ? -1 : a.i === b.i ? 0 : 1)
        out[index] = {logId: logId, index: index, name: name, alive: true,
                      state: mediaElement,
                      log: beautifyMessages(messages, objects),
                      objects: objects};
      } else {
        // Found the old element, add new data to it.
        // The display name could change (if src changes).
        oldMediaElement.name = mediaElement.HTMLMediaElement.currentSrc ||
                               logId ||
                               (url + "#" + oldMediaElement.index.toString());
        // It is alive!
        oldMediaElement.alive = true;
        // Completely update the state.
        oldMediaElement.state = mediaElement;
        // Combine logs.
        let messages = debugLog.messages || [];
        if (messages.length !== 0) {
          reusedWithLog++;
          // Add log messages and re-sort (as sort messages may be added, that
          // actually happened before the previous data dump, but they were not
          // yet associated with this element.)
          oldMediaElement.log = oldMediaElement.log.concat(beautifyMessages(messages, objects));
          oldMediaElement.log.sort((a,b) => a.i < b.i ? -1 : a.i === b.i ? 0 : 1)
          // Completely update the log objects.
          oldMediaElement.objects = objects;
        } else {
          reusedWithoutLog++;
        }
      }
    }
  }

  let end = Date.now();
  console.log(`analyzed ${logLengths} bytes of logs in ${end - start}ms: before=${before} -> dead=${before-(reusedWithoutLog+reusedWithLog)} reused without new log=${reusedWithoutLog} reused with new log=${reusedWithLog} created=${created}`);

  return out;
}

class TextInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {value: props.value || ""};
    this.handleChange = this.handleChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  handleChange(event) {
    let newValue = event.target.value;
    this.setState({value: newValue});
    this.props.onChange(this.props.name, newValue);
  }
  onKeyDown(event) {
    if (event.keyCode === 27) {
      event.preventDefault();
      this.setState({value: ""});
      this.props.onChange(this.props.name, "");
    }
  }
  render() {
    return (
      <label>
        {this.props.label + ": "}
        <input type="text" value={this.state.value} onChange={this.handleChange} onKeyDown={this.onKeyDown} />
      </label>);
  }
}

class CheckboxInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {checked: props.checked || false};
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event) {
    let newChecked = event.target.checked;
    this.setState({checked: newChecked});
    this.props.onChange(this.props.name, newChecked);
  }
  render() {
    return (
      <label>
        <input type="checkbox" checked={this.state.checked} onChange={this.handleChange} />
        {this.props.label}
      </label>);
  }
}

function RadioInput(props) {
  return (
    <label>
      <input type="radio" checked={props.selected} onChange={props.onChange} />
      {props.label}
    </label>);
}

function MediaElementSelector(props) {
  return <RadioInput label={props.index.toString() +
                            ": " + (props.name ? props.name : "?")
                            + (props.alive ? (" " + (props.paused ? "⏸" : "▶️")
                            + Math.round(props.time).toString()) : "😵")}
                     selected={props.selected}
                     onChange={() => props.selectMediaElement(props.index)} />
  // return (
  //   <button onClick={() => props.selectMediaElement(props.index)}>
  //     {props.index.toString() +
  //      ": " + (props.name ? props.name : "?")
  //      + (props.alive ? (" " + (props.paused ? "⏸" : "▶️") + Math.round(props.time).toString()) : "😵")}
  //   </button>);
}

function MediaElementSelectors(props) {
  return (
    <div>
      {props.data.length > 0
       ? props.data.map(
           me => <MediaElementSelector key={me.index.toString()}
                                       index={me.index}
                                       name={me.name ? me.name : "?"}
                                       alive={me.alive}
                                       paused={me.state.HTMLMediaElement.paused}
                                       time={me.state.HTMLMediaElement.currentTime}
                                       selected={props.selected === me.index}
                                       selectMediaElement={props.selectMediaElement} />)
       : "No media"}
    </div>);
}

function TopBar(props) {
  return (
    <div>
      <MediaElementSelectors data={props.data} selected={props.selected} selectMediaElement={props.selectMediaElement} />
    </div>);
}

function MediaElementCurrentState(props) {
  return(
    <ReactJson src={ props.data }
               name="MediaInfo"
               displayObjectSize={false}
               displayDataTypes={false}
               enableClipboard={false} />);
}

class MediaElementLog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {filter:"",
                  classes: [
                    // { name:"", visible:true/false },
                  ]};

    // This binding is necessary to make `this` work in callbacks
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleClassVisibilityChange = this.handleClassVisibilityChange.bind(this);
  }

  handleFilterChange(_, value) {
    this.setState({filter:value});
  }

  handleClassVisibilityChange(name, value) {
    this.setState(function(prevState, props) {
      let newClass = {name:name, visible:value};
      let found = false;
      let newClasses = prevState.classes.map(function(c) {
        if (c.name === name) {
          found = true;
          return newClass;
        } else {
          return c;
        }});
      if (!found) {
        newClasses.push(newClass);
        newClasses.sort(function(a, b) {
          let A = a.name.toUpperCase();
          let B = b.name.toUpperCase();
          return (A < B) ? -1 : (A > B) ? 1 : 0;
        });
      }
      return {classes: newClasses};
    });
  }

  isClassVisible(classes, cat) {
    for (let i = 0; i < classes.length; ++i) {
      if (classes[i].name === cat) {
        return classes[i].visible;
      }
    }
    return undefined;
  }

  render() {
    if (!this.props.log || this.props.log.length === 0) {
      // Just don't display anything if there is no log.
      return null;
    }

    let classes = this.state.classes.slice();

    let self = this;
    let log = this.props.log.filter(function(message) {
      let visible = self.isClassVisible(classes, message.cat);
      if (visible === undefined) {
        classes.push({name: message.cat, visible: true});
        classes.sort(function(a, b) {
          let A = a.name.toUpperCase();
          let B = b.name.toUpperCase();
          return (A < B) ? -1 : (A > B) ? 1 : 0;
        });
        visible = true;
      }
      if (!visible) {
        return false;
      }
      if (self.state.filter &&
          !message.ob.includes(self.state.filter) &&
          !message.lbl.includes(self.state.filter) &&
          !message.val.includes(self.state.filter)) {
        return false;
      }
      return true;
    });
    console.log(classes.length, log.length);

    if (log.length === 0) {
      log = [{val: "No messages to show"}];
    }

    return (
      <div>
        <div>
          <TextInput label="Filter" name="filter" value={this.state.filter} onChange={this.handleFilterChange} />
          {classes.map(c => <CheckboxInput key={c.name}
                                           label={c.name}
                                           name={c.name}
                                           checked={c.visible}
                                           onChange={self.handleClassVisibilityChange} />)}
        </div>
        <AutoSizer disableHeight>
          {({ width }) => (
            <Table width={width * .99}
                   height={300}
                   headerHeight={20}
                   rowHeight={30}
                   rowCount={log.length}
                   rowGetter={({ index }) => log[index]} >
              <Column width={width * .10}
                      label='#'
                      dataKey='i' />
              <Column width={width * .10}
                      label='⏱'
                      dataKey='ts' />
              <Column width={width * .20}
                      label='Object'
                      dataKey='ob' />
              <Column width={width * .10}
                      label='Message Type'
                      dataKey='cat' />
              <Column width={width * .20}
                      label='Label'
                      dataKey='lbl' />
              <Column width={width * .29}
                      label='Value'
                      dataKey='val' />
            </Table>
          )}
        </AutoSizer>
      </div>);
  }
}

class PanelDisplay extends React.Component {
  constructor(props) {
    super(props);

    // const data = props.data;

    // const analyzed = analyzeData(data);

    this.state = {data:[],
                  selected:-1,
                  filter:"",
                  lifetime:false,
                  link:false,
                  property:true,
                  event:true,
                  api:true};

    // This binding is necessary to make `this` work in callbacks
    this.selectMediaElement = this.selectMediaElement.bind(this);
  }

  requestData() {
    console.log("request data...");
    let start = Date.now();
    // Keep a reference to 'this', as it's hidden from then/catch functions.
    let self = this;
    this.props.comms.GetMedia().then(function(data) {
      if (self.timerId === null) {
        return;
      }
      let end = Date.now();
      console.log(`... got data after ${end - start}ms`);
      self.gotData(data);
    }).catch(function(reason) {
      console.log(`Failed to get data: ${reason.toString()}`);
      self.requestDataLater();
    });
  }

  requestDataLater() {
    this.timerId = setTimeout(() => this.requestData(), 1000);
  }

  cancelDataRequest() {
    clearTimeout(this.timerId);
    this.timerId = null;
  }

  gotData(data) {
    this.setState((prevState, props) => ({data:analyzeData(prevState.data, data)}));
    this.requestDataLater();
  }

  componentDidMount() {
    console.log("componentDidMount()");
    this.requestData();
  }

  componentWillUnMount() {
    console.log("componentWillUnMount()");
    cancelDataRequest();
  }

  componentWillUpdate() {
    // console.log("componentWillUpdate()");
    this.updateStart = Date.now();
  }

  componentDidUpdate() {
    // console.log(`componentDidUpdate() after ${Date.now() - this.updateStart}ms`);
  }

  selectMediaElement(index) {
    this.setState({selected:index});
  }

  render() {
    return (
      <div width="100%" height="100%" >
        <TopBar data={this.state.data}
                selected={this.state.selected}
                selectMediaElement={this.selectMediaElement} />
        { this.state.selected >= 0 &&
          <MediaElementCurrentState
           data={ this.state.data[this.state.selected].state } /> }
        { this.state.selected >= 0 &&
          <MediaElementLog log={ this.state.data[this.state.selected].log } /> }
      </div>
    );
  }
}

// EXPORT MODULE
const renderer = {};
module.exports = renderer;

const renderApp = (comms) => {
  ReactDOM.render(<PanelDisplay comms={comms} />,
                  document.getElementById('panel'));
};

// rendering
renderer.renderApp = renderApp;
