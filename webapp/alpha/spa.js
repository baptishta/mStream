// Example usage:
// const onWinResize = e => console.log(e);
// const onWinResizeDebounced = debounce(onWinResize, 50);
// const onDOMContentLoaded = e => {
//   window.addEventListener("resize", onWinResizeDebounced);
// };
const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

const App = (function() {
  const ViewBreakPoints = {
    SMALL: 600,
    MEDIUM: 768
  };
  const Views = {
    SMALL: "view--small",
    MEDIUM: "view--medium",
    LARGE: "view--large"
  };

  const getView = () => {
    if (window.innerWidth <= ViewBreakPoints.SMALL) { return Views.SMALL; }
    if (window.innerWidth > ViewBreakPoints.SMALL && window.innerWidth <= ViewBreakPoints.MEDIUM) { return Views.MEDIUM; }
    else { return Views.LARGE; }
  }

  const setViewClass = () => {
    const view = getView();
    const html = document.documentElement;
    if (!html.classList.contains(view)) {
      Object.keys(Views).forEach(key => html.classList.remove(Views[key]));
      html.classList.add(view);
    }
  };

  const Orientations = {
    PORTRAIT: "orientation--portrait",
    LANDSCAPE: "orientation--landscape"
  }

  const getOrientation = () => {
    return window.innerHeight <= 460 ? Orientations.LANDSCAPE : Orientations.PORTRAIT;
  }

  const setOrientationClass = () => {
    const orientation = getOrientation();
    const html = document.documentElement;
    if (!html.classList.contains(orientation)) {
      Object.keys(Orientations).forEach(key => html.classList.remove(Orientations[key]));
      html.classList.add(orientation);
    }
  }

  const scrollIntoViewIfNeeded = el => {
    try {
      typeof el.scrollIntoViewIfNeeded === "function" && el.scrollIntoViewIfNeeded();
    } catch (e) { boilerplateFailure(e) }
  }

  const keepCollectionItemInView = (element) => {
    if (!element.classList.contains("collection-item")) { return false; }

    const container = document.getElementById("filelist").getElementsByClassName("collection")[0];
    if (container instanceof HTMLElement === false) { return false; }

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    if (elementRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - elementRect.top;
    } else if (elementRect.bottom > containerRect.bottom) {
      container.scrollTop += elementRect.bottom - containerRect.bottom;
    }
    return container.scrollTop;
  }

  const onWinResize = e => {
    // document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`); // commented by baptishta
    setViewClass();
    setOrientationClass();
    // console.log(getView());
  };
  const onWinResizeDebounced = debounce(onWinResize, 50);

  const onDOMContentLoaded = e => {
    document.getElementById("sidenav-cover").addEventListener("click", toggleSideMenu);
    // document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`); // commented by baptishta
    setViewClass();
    setOrientationClass();
    window.addEventListener("resize", onWinResizeDebounced);
  };

  const init = () => {
    document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
  };

  const scrollToSong = () => {
    requestAnimationFrame(() => { 
      if (MSTREAMPLAYER.playlist.length === 0) { return; }
      const playlistEl = document.getElementById('playlist');
      const nowPlayingBtn = document.getElementById('now-playing-tab-btn');
      if ((App.getView() === App.Views.SMALL && nowPlayingBtn.classList.contains('selected-tab')) || (App.getView() !== App.Views.SMALL)) {
        const playItem = playlistEl.getElementsByClassName('np-queue-active')[0];
        scrollIntoViewIfNeeded(playItem);
      }
    });
  };

  const toggleDebugMode = (checked) => {
    const debugContentEl = document.getElementById("debug-mode-content");
    if (checked) {
      debugContentEl.innerHTML = `<div>window.innerWidth: ${window.innerWidth}; window.innerHeight: ${window.innerHeight};</div>`
      const contentListEl = document.createElement("ol");
      contentListEl.setAttribute("id", "debug-content-list");
      debugContentEl.appendChild(contentListEl);
      window.addEventListener("keydown", keyEventDebug);
    } else {
      debugContentEl.innerHTML = "";
      window.removeEventListener("keydown", keyEventDebug);
    }
  }

  const keyEventDebug = e => {
    const contentListEl = document.getElementById("debug-content-list");

    const content = document.createElement("li");
    contentListEl.appendChild(content);
    content.innerHTML = `event.key: "${e.key}"; event.code: "${e.code}"; event.keyCode: "${e.keyCode}";`;

    const debugContentEl = document.getElementById("debug-mode-content");
    debugContentEl.scrollTop = debugContentEl.scrollHeight;
  }

  let focusedEl = undefined;
  let focusableElements = [];

  //called by functions after rendering HTML
  const setFocusableElements = () => {
    const backBtn = document.getElementById("browser-back-btn");
    const addAllBtn = document.getElementById("browser-add-all-btn");
    const fileListCollection = document.getElementById("filelist").getElementsByClassName("collection")[0];

    focusableElements = [backBtn, addAllBtn];

    if (fileListCollection !== undefined && fileListCollection.children.length > 0) {
      focusableElements.push(...fileListCollection.children);

      if (focusedEl !== backBtn) {
        focusOnBrowserEl("", fileListCollection.children[0]); //focus on the first li.collection-item
      }
    }
  }

  const focusOnBrowserEl = (action, element) => {
    if (focusableElements.length === 0) { return false; }

    const focusedElIndex = focusableElements.indexOf(focusedEl)

    if (element instanceof HTMLElement) {
      focusedEl !== undefined && focusedEl.classList.remove("focused-element");
      focusedEl = element;
      focusedEl.classList.add("focused-element");
      return focusedEl;
    }

    if (action === "prev" && focusedElIndex > 0) {
      focusedEl.classList.remove("focused-element");
      focusedEl = focusableElements[focusedElIndex - 1];
      focusedEl.classList.add("focused-element");
      // scrollIntoViewIfNeeded(focusedEl);
      keepCollectionItemInView(focusedEl);
      return focusedEl;
    }

    if (action === "next" && focusedElIndex < (focusableElements.length - 1)) {
      focusedEl.classList.remove("focused-element");
      focusedEl = focusableElements[focusedElIndex + 1];
      focusedEl.classList.add("focused-element");
      // scrollIntoViewIfNeeded(focusedEl);
      keepCollectionItemInView(focusedEl);
      return focusedEl;
    }
    return false;
  };

  const clickOnFocusedEl = () => {
    if (typeof focusedEl.onclick === "function") {
      focusedEl.onclick();
    } else {
      const onclickChildren = [];
      focusedEl.children.forEach(el => typeof el.onclick === "function" && onclickChildren.push(el));
      onclickChildren[0] !== undefined && onclickChildren[0].onclick();
    }
  }

  function formatSongDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  const formatFilePathToHTML = (path) => {
    const arr = path.replaceAll("/", "/<wbr>").split(/(?<=\/<wbr>)/);
    arr[arr.length-1] = `<span class="filepath-html--last">${arr[arr.length-1]}</span>`;
    return `<div class="filepath-html">${arr.join("")}</div>`
  }

  const getStatePaths = (_programState, currentState) => {
    const isFileExplorerPath = currentState.state === "fileExplorer" && currentState.content !== undefined;
    const currentStatePath = isFileExplorerPath ? currentState.content.path : _programState.map(item => item.name || item.state).join("/");
    const currentStatePathURL = isFileExplorerPath ? `#fileExplorer/${currentStatePath}` : `#${currentStatePath}`
    return {
      path: currentStatePath,
      pathURL: currentStatePathURL
    }
  }

  const historyPushState = (_programState) => {
    const currentState = _programState[_programState.length-1];
    const currentStatePaths = getStatePaths(_programState, currentState);
    const historyObj = { state: currentState.state, path: currentStatePaths.path };
    try {
      window.history.pushState(historyObj, historyObj.state, currentStatePaths.pathURL);
    } catch (e) { boilerplateFailure(e) }

    // console.log(history.state);
  }

  const toggleBackBtn = (_programState) => {
    const backBtn = document.getElementById("browser-back-btn");
    if (_programState.length < 2) { backBtn.classList.add("browser-back-btn--disabled"); } else { backBtn.classList.remove("browser-back-btn--disabled"); }
  }

  //refer to: function observeArrayProperty(...); change.type: "reassignment" | "mutation"
  const programStateOnChange = change => {
    toggleBackBtn(programState);

    if (change.type === "mutation") {
      //arr.pop()
      if (!change.newValue || change.key === "length") {
        return;
      }
    //change.type === "reassignment"
    } else {
      if (JSON.stringify(change.newValue) === JSON.stringify(change.oldValue)) {
        return;
      }
    }

    historyPushState(programState);
  }

  return {
    init,
    getView,
    Views,
    scrollToSong,
    toggleDebugMode,
    focusOnBrowserEl, //Arrows keydown event
    clickOnFocusedEl, //Enter keydown event
    getFocusedEl: () => focusedEl,
    getFocusableElements: () => focusableElements,
    setFocusableElements,
    formatSongDuration,
    formatFilePathToHTML,
    programStateOnChange,
    historyPushState,
    getStatePaths,
    fileExplorerCache: new Map()
  };
})();

App.init();

function toggleSideMenu() {
  document.getElementById("sidenav-cover").classList.toggle("click-through");

  // Handles initial state rendered on page load
  if (!document.getElementById("sidenav-cover").classList.contains("fade-in") && !document.getElementById("sidenav-cover").classList.contains("fade-out")) {
    document.getElementById("sidenav-cover").classList.toggle("fade-in");
  } else {
    document.getElementById("sidenav-cover").classList.toggle("fade-in");
    document.getElementById("sidenav-cover").classList.toggle("fade-out");
  }

  // Handles initial state rendered on page load
  if (!document.getElementById("sidenav").classList.contains("menu-in") && !document.getElementById("sidenav").classList.contains("menu-out")) {
    document.getElementById("sidenav").classList.toggle("menu-out");
  } else {
    document.getElementById("sidenav").classList.toggle("menu-in");
    document.getElementById("sidenav").classList.toggle("menu-out");
  }

  document.getElementById("sidenav-button").classList.toggle('active');
}

function closeSideMenu() {
  if (document.getElementById("sidenav").classList.contains("menu-out")) {
    toggleSideMenu();
  }
}

function changeView(fn, el){
  const elements = document.querySelectorAll('.side-nav-item'); // or:
  elements.forEach(elm => {
    elm.classList.remove("select")
  });

  el.classList.add("select");

  // close nav on mobile
  closeSideMenu();

  toggleLocalSearch(false);
  document.getElementById("directory-file-count").innerHTML = "";
  
  fn();
}

function toggleThing(el, tabElId) {
  if (el.classList.contains("selected-tab")) { return; }

  el.parentElement.children.forEach(el => el.classList.remove("selected-tab"));
  el.classList.add("selected-tab");

  const contentListsEl = document.getElementById("content-lists");
  contentListsEl.children.forEach(el => el.classList.remove("selected-content-tab"));
  document.getElementById(tabElId).classList.add("selected-content-tab");

  App.scrollToSong();
}

function observeArrayProperty(object, property, initialValue, onChange) {
  let value;

  function makeArray(array) {
    let proxy;

    const target = [...array];

    proxy = new Proxy(target, {
      set(target, key, newValue, receiver) {
        const oldValue = target[key];

        const result = Reflect.set(
          target,
          key,
          newValue,
          receiver
        );

        if (oldValue !== newValue) {
          onChange({
            type: "mutation",
            property,
            key,
            oldValue,
            newValue,
            array: proxy
          });
        }

        return result;
      },

      deleteProperty(target, key) {
        const oldValue = target[key];
        const result = Reflect.deleteProperty(target, key);

        if (result) {
          onChange({
            type: "mutation",
            property,
            key,
            oldValue,
            array: proxy
          });
        }

        return result;
      }
    });

    return proxy;
  }

  value = makeArray(initialValue);

  Object.defineProperty(object, property, {
    enumerable: true,
    configurable: true,

    get() {
      return value;
    },

    set(newValue) {
      if (!Array.isArray(newValue)) {
        throw new TypeError(`${property} must be an array`);
      }

      const oldValue = value;
      value = makeArray(newValue);

      onChange({
        type: "reassignment",
        property,
        oldValue,
        newValue: value
      });
    }
  });
}
//Usage:
/*
const obj = {
  name: "test"
};

observeArrayProperty(
  obj,
  "arr",
  [1, 2],
  change => {
    console.log("Changed:", change);
  }
);

obj.arr = [3, 4];
// → type: "reassignment"
obj.arr.push(5);
// → type: "mutation", key: "2"
obj.arr[0] = 100;
// → type: "mutation", key: "0"
obj.arr.pop();
// → type: "mutation", key: "2"
delete obj.arr[0];
// → type: "mutation", key: "0"
*/