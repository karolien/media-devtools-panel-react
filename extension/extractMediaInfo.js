(function() {
  function jsonifyMediaError(error) {
    if (error === null) {
      return null;
    }
    let code = error.code;
    let code_name;
    switch (code) {
      case MediaError.MEDIA_ERR_ABORTED: code_name = "MEDIA_ERR_ABORTED"; break;
      case MediaError.MEDIA_ERR_NETWORK: code_name = "MEDIA_ERR_NETWORK"; break;
      case MediaError.MEDIA_ERR_DECODE: code_name = "MEDIA_ERR_DECODE"; break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: code_name = "MEDIA_ERR_SRC_NOT_SUPPORTED"; break;
    }
    let message = error.message;
    return { code, code_name, message };
  }

  function networkStateString(state) {
    switch (state) {
      case HTMLMediaElement.NETWORK_EMPTY: return "NETWORK_EMPTY";
      case HTMLMediaElement.NETWORK_IDLE: return "NETWORK_IDLE";
      case HTMLMediaElement.NETWORK_LOADING: return "NETWORK_LOADING";
      case HTMLMediaElement.NETWORK_NO_SOURCE: return "NETWORK_NO_SOURCE";
    }
    return "?";
  }

  function jsonifyTimeRanges(ranges) {
    out = [];
    for (let l = 0; l < ranges.length; ++l) {
      out.push({ start : ranges.start(l), end : ranges.end(l) });
    }
    return out;
  }

  function jsonifyMediaStream(stream) {
    if (stream === null) {
      return null;
    }
    let { active, ended, id } = stream;
    return { active, ended, id };
  }

  function MediaDetails(media)
  {
    const res = { url : document.location.href, mediaElements : [] };

    // wait for any pending `mozRequestDebugInfo` promise.
    const waitForMediaElements = [];

    for (let v of media) {
      const {
        // HTMLMediaElement properties
        autoplay,
        buffered,
        controls,
        crossOrigin,
        currentSrc,
        currentTime,
        defaultMuted,
        defaultPlaybackRate,
        disableRemotePlayback,
        duration,
        ended,
        error,
        loop,
        mediaGroup,
        mozAudioCaptured,
        mozFragmentEnd,
        muted,
        networkState,
        paused,
        playbackRate,
        played,
        preload,
        preservesPitch,
        readyState,
        seekable,
        seeking,
        sinkId,
        src,
        srcObject,
        volume,
        // HTMLVideoElement properties
        height,
        mozDecodedFrames,
        mozFrameDelay,
        mozHasAudio,
        mozPaintedFrames,
        mozParsedFrames,
        mozPresentedFrames,
        videoHeight,
        videoWidth,
        width,
      } = v;

      const mediaElementInfo = {
        HTMLMediaElement: {
          autoplay,
          buffered: jsonifyTimeRanges(buffered),
          controls,
          crossOrigin,
          currentSrc,
          currentTime,
          defaultMuted,
          defaultPlaybackRate,
          disableRemotePlayback,
          duration,
          ended,
          error: jsonifyMediaError(error),
          loop,
          mediaGroup,
          mozAudioCaptured,
          mozFragmentEnd,
          muted,
          networkState,
          networkState_name: networkStateString(networkState),
          paused,
          playbackRate,
          played: jsonifyTimeRanges(played),
          preload,
          preservesPitch,
          readyState,
          seekable: jsonifyTimeRanges(seekable),
          seeking,
          sinkId,
          src,
          srcObject: jsonifyMediaStream(srcObject),
          volume,
        },
        HTMLVideoElement: {
          height,
          mozDecodedFrames,
          mozFrameDelay,
          mozHasAudio,
          mozPaintedFrames,
          mozParsedFrames,
          mozPresentedFrames,
          videoHeight,
          videoWidth,
          width,
        }
      };

      res.mediaElements.push(mediaElementInfo);

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
            try {
              debugInfo = debugInfo.replace(/\t/g, '').split(/\n/g);

              var JSONDebugInfo = "{";
              for(let g =0; g<debugInfo.length-1; g++){
                var pair = debugInfo[g].split(": ");
                JSONDebugInfo += '"' + pair[0] + '":"' + pair[1] + '",';
              }
              JSONDebugInfo = JSONDebugInfo.slice(0,JSONDebugInfo.length-1);
              JSONDebugInfo += "}";
              mediaElementInfo.debugInfo = JSON.parse(JSONDebugInfo);
            } catch (err) {
              console.log(`Error '${err.toString()} in JSON.parse(${JSONDebugInfo})`);
              mediaElementInfo.debugInfo = JSONDebugInfo;
            }
          });

        waitForMediaElements.push(waitForMediaElementInfo);
      } else {
        // backward compatibility.
        // NOTE: I'm not sure that this is still needed.
        mediaElementInfo.debugInfo = v.mozDebugReaderData;

      }

      if ("mozRequestDebugLog" in v) {
        const waitForMediaElementInfo =
          v.mozRequestDebugLog().then(JSONDebugInfo => {
            mediaElementInfo.debugLogJSON = JSONDebugInfo;
          });

        waitForMediaElements.push(waitForMediaElementInfo);
      }
    }

    return Promise.all(waitForMediaElements).then(() => {
      // Return the media elements info to the browser.tabs.executeScript
      // caller.
      return res;
    });
  }

  function getVideos(doc) {
    let videos = [];
    if (doc) {
      for (let video of doc.getElementsByTagName("video")) {
        videos.push(video);
      }
      let iframes = doc.getElementsByTagName('iframe');
      for (let iframe of iframes) {
        let ivideos = getVideos(iframe.contentDocument);
        videos = videos.concat(ivideos);
      }
    }
    return videos;
  }

  if ("mozEnableDebugLog" in HTMLMediaElement) {
    HTMLMediaElement.mozEnableDebugLog();
  }

  var media = getVideos(document);
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
