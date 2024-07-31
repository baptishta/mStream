const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};
// Example usage:
// const handleMouseMove = debounce((mouseEvent) => { console.log(mouseEvent) }, 250);
// document.addEventListener('mousemove', handleMouseMove);

const App = (function() {
  const ViewBreakPoints = {
    SMALL: 600,
    MEDIUM: 768
  };
  const Views = {
    SMALL: "view--small",
    MEDIUM: "view--medium"
  };

  const getView = () => window.innerWidth <= ViewBreakPoints.SMALL ? Views.SMALL: Views.MEDIUM;

  const setViewClass = () => {
    const view = getView();
    const html = document.documentElement;
    if (!html.classList.contains(view)) {
      Object.keys(Views).forEach(key => html.classList.remove(Views[key]));
      html.classList.add(view);
    }
  };

  const onWinResize = e => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`);
    setViewClass();
    // console.log(getView());
  };
  const onWinResizeDebounced = debounce(onWinResize, 50);

  const onDOMContentLoaded = e => {
    document.getElementById("sidenav-cover").addEventListener("click", toggleSideMenu);
  
    document.documentElement.style.setProperty('--vh', `${window.innerHeight/100}px`);
    setViewClass();
    window.addEventListener("resize", onWinResizeDebounced);
  };

  const init = () => {
    document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
  };

  const scrollToSong = () => {
    requestAnimationFrame(() => { 
      const playlistEl = document.getElementById('playlist');
      const nowPlayingBtn = document.getElementById('now-playing-tab-btn');
      if (playlistEl !== null && ( (App.getView() === App.Views.SMALL && nowPlayingBtn.classList.contains('selected-tab')) || (App.getView() !== App.Views.SMALL) )) {
        const playItem = playlistEl.getElementsByClassName('playing')[0];
        if (playItem) {
          playItem.scrollIntoViewIfNeeded();
        }
      }
    });
  };

  return {
    init,
    getView,
    Views,
    scrollToSong
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
  fn();
}

function toggleThing(el, bool) {
  el.parentElement.children.forEach(el => el.classList.remove("selected-tab"));
  el.classList.add("selected-tab");

  if (bool === false) {
    document.getElementById('browser').classList.add('hide-on-small-only');
  }else {
    document.getElementById('browser').classList.remove('hide-on-small-only');
  }

  App.scrollToSong();
}