function isChrome() {
  var isChromium = window.chrome,
    winNav = window.navigator,
    vendorName = winNav.vendor,
    isOpera = winNav.userAgent.indexOf("OPR") > -1,
    isIEedge = winNav.userAgent.indexOf("Edge") > -1,
    isIOSChrome = winNav.userAgent.match("CriOS");

  if(isIOSChrome){
    return true;
  } else if(isChromium !== null && isChromium !== undefined && vendorName === "Google Inc." && isOpera == false && isIEedge == false) {
    return true;
  } else {
    return false;
  }
}

// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuid() {
    function randomDigit() {
        if (crypto && crypto.getRandomValues) {
            var rands = new Uint8Array(1);
            crypto.getRandomValues(rands);
            return (rands[0] % 16).toString(16);
        } else {
            return ((Math.random() * 16) | 0).toString(16);
        }
    }
    var crypto = window.crypto || window.msCrypto;
    return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);
}

function gotoListeningState() {
  const micListening = document.querySelector(".mic .listening");
  const micReady = document.querySelector(".mic .ready");

  micListening.style.display = "block";
  micReady.style.display = "none";
}

function gotoReadyState() {
  const micListening = document.querySelector(".mic .listening");
  const micReady = document.querySelector(".mic .ready");

  micListening.style.display = "none";
  micReady.style.display = "block";
}

function addBotItem(text) {
  const appContent = document.querySelector(".app-content");
  appContent.innerHTML += '<div class="item-container item-container-bot"><div class="item"><p>' + text + '</p></div></div>';
  appContent.scrollTop = appContent.scrollHeight; // scroll to bottom
}

function addUserItem(text) {
  const appContent = document.querySelector(".app-content");
  appContent.innerHTML += '<div class="item-container item-container-user"><div class="item"><p>' + text + '</p></div></div>';
  appContent.scrollTop = appContent.scrollHeight; // scroll to bottom
}

function displayCurrentTime() {
  const timeContent = document.querySelector(".time-indicator-content");
  const d = new Date();
  const s = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  timeContent.innerHTML = s;
}

function addError(text) {
  addBotItem(text);
  const footer = document.querySelector(".app-footer");
  footer.style.display = "none";
}

document.addEventListener("DOMContentLoaded", function(event) {

  var GoogleAuth;
  var SCOPE = 'https://www.googleapis.com/auth/dialogflow';
  //
  // gapi.load('client:auth2', function() {
  //   gapi.client.init({
  //     'apiKey': '0a8eb74242c143b89ea7495f5f73f062',
  //     'clientId': '935404433291-vbbjib61ue1qt6kuqqq00b7fndddlals.apps.googleusercontent.com',
  //     'scope': SCOPE
  //   }).then(function() {
  //     GoogleAuth = gapi.auth2.getAuthInstance();
  //     // Listen for sign-in state changes.
  //     GoogleAuth.isSignedIn.listen(updateSigninStatus);
  //
  //     // Handle initial sign-in state. (Determine if user is already signed in.)
  //     var user = GoogleAuth.currentUser.get();
  //     setSigninStatus();
  //
  //   });
  // });

  // test for relevant API-s
  // for (let api of ['speechSynthesis', 'webkitSpeechSynthesis', 'speechRecognition', 'webkitSpeechRecognition']) {
  //   console.log('api ' + api + " and if browser has it: " + (api in window));
  // }

  displayCurrentTime();

  // check for Chrome
  if (!isChrome()) {
    addError("This demo only works in Google Chrome.");
    return;
  }

  if (!('speechSynthesis' in window)) {
    addError("Your browser doesn’t support speech synthesis. This demo won’t work.");
    return;
  }

  if (!('webkitSpeechRecognition' in window)) {
    addError("Your browser cannot record voice. This demo won’t work.");
    return;
  }

  // Now we’ve established that the browser is Chrome with proper speech API-s.


  // Initial feedback message.
  addBotItem("Hi! I’m voicebot. Tap the microphone and start talking to me.");

  var sessionId = uuid();

  var recognition = new webkitSpeechRecognition();
  var recognizedText = null;
  recognition.continuous = false;
  recognition.onstart = function() {
    recognizedText = null;
  };
  recognition.onresult = function(ev) {
    recognizedText = ev["results"][0][0]["transcript"];

    addUserItem(recognizedText);
    ga('send', 'event', 'Message', 'add', 'user');


    gapi.client.request({
      path: 'https://dialogflow.googleapis.com/v2/projects/rakan-c4b07/agent/sessions/' + sessionId + ':detectIntent',
      method: "POST",
      body: {
        "queryInput": {
          "text": {
            "text": recognizedText,
            "languageCode": "en"
          }
        }
      }
    }).then(handleResponse, handleError);

    function handleResponse(serverResponse) {

      // Set a timer just in case. so if there was an error speaking or whatever, there will at least be a prompt to continue
      var timer = window.setTimeout(function() { startListening(); }, 5000);

      const speech = serverResponse["result"]["queryResult"]["fulfillmentText"];
      var msg = new SpeechSynthesisUtterance(speech);
      addBotItem(speech);
      ga('send', 'event', 'Message', 'add', 'bot');
      msg.addEventListener("end", function(ev) {
        window.clearTimeout(timer);
        startListening();
      });
      msg.addEventListener("error", function(ev) {
        window.clearTimeout(timer);
        startListening();
      });

      window.speechSynthesis.speak(msg);
    }
    function handleError(serverError) {
      console.log("Error from DialogFlow server: ", serverError);
    }
  };

  recognition.onerror = function(ev) {
    console.log("Speech recognition error", ev);
  };
  recognition.onend = function() {
    gotoReadyState();
  };

  function startListening() {
    gotoListeningState();
    recognition.start();
  }

  const startButton = document.querySelector("#start");
  startButton.addEventListener("click", function(ev) {
    ga('send', 'event', 'Button', 'click');
    startListening();
    ev.preventDefault();
  });

  // Esc key handler - cancel listening if pressed
  // http://stackoverflow.com/questions/3369593/how-to-detect-escape-key-press-with-javascript-or-jquery
  document.addEventListener("keydown", function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key == "Escape" || evt.key == "Esc");
    } else {
        isEscape = (evt.keyCode == 27);
    }
    if (isEscape) {
        recognition.abort();
    }
  });


  // Google Authentication

  document.querySelector(".sign-in-or-out-link").addEventListener("click", handleAuthClick);

  function setSigninStatus(isSignedIn) {
    var user = GoogleAuth.currentUser.get();
    var isAuthorized = user.hasGrantedScopes(SCOPE);
    if (isAuthorized) {
      console.log("User signed in. Updating UI to reflect that");
      var email = user.getBasicProfile().getEmail();

      document.querySelector(".sign-in-or-out-label").innerHTML = 'Signed in as ' + email + ".";
      document.querySelector(".sign-in-or-out-link").innerHTML = 'Sign out';
      document.querySelector(".app-footer").classList.remove("not-signed-in");
    } else {
      console.log("User not signed in. Updating UI to reflect that.");
      document.querySelector(".sign-in-or-out-label").innerHTML = 'Not signed in. You must sign in with Google to continue.';
      document.querySelector(".sign-in-or-out-link").innerHTML = 'Sign in';
      document.querySelector(".app-footer").classList.add("not-signed-in");
    }
  }

  function updateSigninStatus(isSignedIn) {
    setSigninStatus();
  }

  function handleAuthClick() {
    if (GoogleAuth.isSignedIn.get()) {
      // User is authorized and has clicked 'Sign out' button.
      GoogleAuth.signOut();
    } else {
      // User is not signed in. Start Google auth flow.
      GoogleAuth.signIn();
    }
  }


});
