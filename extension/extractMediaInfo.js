(function() {
  function MediaDetails(media)
  {
    const res = { url : document.location.href, mediaElements : [] };

    // wait for any pending `mozRequestDebugInfo` promise.
    const waitForMediaElements = [];

    for (let v of media) {
      const { currentSrc, currentTime, readyState } = v;

      const mediaElementInfo = {
        currentSrc,
        currentTime,
        readyState,
      };

      res.mediaElements.push(mediaElementInfo);

      if (v.error) {
        let s = " error: " + v.error.code;
        if ((typeof v.error.message === 'string' ||
             v.error.message instanceof String) &&
            v.error.message.length > 0) {
          s += " (" + v.error.message + ")";
        }
        mediaElementInfo.error = s;
      }

      const quality = v.getVideoPlaybackQuality();
      let ratio = "--";

      if (quality.totalVideoFrames > 0) {
        ratio = 100 -
                Math.round(100 * quality.droppedVideoFrames /
                           quality.totalVideoFrames);
        ratio += "%";
      }

      const { totalVideoFrame, droppedVideoFrames, corruptedVideoFrames } =
        quality;

      mediaElementInfo.videoPlaybackQuality =
        { ratio, totalVideoFrame, droppedVideoFrames, corruptedVideoFrames };

      mediaElementInfo.bufferedRanges = [];

      for (let l = 0; l < v.buffered.length; ++l) {
        mediaElementInfo.bufferedRanges.push(
          { start : v.buffered.start(l), end : v.buffered.end(l) });
      }

      mediaElementInfo.mozMediaSourceObject = [];

      const ms = v.mozMediaSourceObject;
      if (ms) {
        for (let k = 0; k < ms.sourceBuffers.length; ++k) {
          const sb = ms.sourceBuffers[k];
          const sourceObjectInfo = { sourceBuffers : [] };
          for (let l = 0; l < sb.buffered.length; ++l) {
            sourceObjectInfo.sourceBuffers.push(
              { start : sb.buffered.start(l), end : sb.buffered.end(l) });
          }
          mediaElementInfo.mozMediaSourceObject.push(sourceObjectInfo);
        }
      }

      function postData(str) { mediaElementInfo.debugInfo = str; }

      if ("mozRequestDebugInfo" in v) {
        const waitForMediaElementInfo =
          v.mozRequestDebugInfo().then(debugInfo => {
            debugInfo = debugInfo.replace(/\t/g, '').split(/\n/g);
            
            var JSONDebugInfo = "{";
            for(let g =0; g<debugInfo.length-1; g++){
              var pair = debugInfo[g].split(": ");
              JSONDebugInfo += '"' + pair[0] + '":"' + pair[1] + '",';
            }
            JSONDebugInfo = JSONDebugInfo.slice(0,JSONDebugInfo.length-1);
            JSONDebugInfo += "}";
            mediaElementInfo.debugInfo = JSON.parse(JSONDebugInfo);
          });

        waitForMediaElements.push(waitForMediaElementInfo);
      } else {
        // backward compatibility.
        // NOTE: I'm not sure that this is still needed.
        mediaElementInfo.debugInfo = v.mozDebugReaderData;

      }
    }

    return Promise.all(waitForMediaElements).then(() => {
      // Return the media elements info to the browser.tabs.executeScript
      // caller.
      return res;
    });
  }

  var media = document.getElementsByTagName("video");
  if (media.length > 0) {
    // Extract the info from all the media elements found and send them
    // to the browser.tabs.executeScript caller.
    try {
      return MediaDetails(media);
    } catch (err) {
      return { url : document.location.href, error : err.message };
    }
  }

  // Send an empty result object to the browser.tabs.executeScript caller.
  return { url : document.location.href, mediaElements : [] };
})();
  