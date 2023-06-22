$(document).ready(function() {
	$("#start").click(function() {
		soundClock();
	})
});

var startMs;
var startFreq = 60; /* Frequency of lowest note, at twelve o'clock */
var octaves = 5;

/* http://www.mikero.com/misc/clocks/ */
var crossTimes = {
	"hm": 43200.0 / (11 * 4),
	"hs": 43200.0 / (719 * 4),
	"ms": 3600.0 / (59 * 4),
	"hms": 4320.0 / 73,
	"mhs": 43200.0 / 697,
	"shm": 43200.0 / 1427
};

function init() {
	Tone.Transport.toggle();
	Tone.Transport.bpm.value = 60;
	startMs = Date.now();
	initLocalClocks();
}

/*
 * Starts any clocks using the user's local time
 * From: cssanimation.rocks/clocks
 */
function initLocalClocks() {
  // Get the local time using JS
  var date = new Date;
  var seconds = date.getSeconds();
  var minutes = date.getMinutes();
  var hours = date.getHours();

  // Create an object with each hand and it's angle in degrees
  var hands = [
    {
      hand: 'hours',
      angle: (hours * 30) + (minutes / 2)
    },
    {
      hand: 'minutes',
      angle: (minutes * 6)
    },
    {
      hand: 'seconds',
      angle: (seconds * 6)
    }
  ];
  // Loop through each of these hands to set their angle
  for (var j = 0; j < hands.length; j++) {
    var elements = document.querySelectorAll('.' + hands[j].hand);
    for (var k = 0; k < elements.length; k++) {
        elements[k].style.webkitTransform = 'rotateZ('+ hands[j].angle +'deg)';
        elements[k].style.transform = 'rotateZ('+ hands[j].angle +'deg)';
        // If this is a minute hand, note the seconds position (to calculate minute position later)
        if (hands[j].hand === 'minutes') {
          elements[k].parentNode.setAttribute('data-second-angle', hands[j + 1].angle);
        }
    }
  }
}

function soundClock() {
	init();
    var synth = new Tone.PolySynth(Tone.Synth).toMaster();
    synth.set({
		"envelope" : {
			"attack" : 0.01,
			"decay": 20.0,
			"sustain": 1.0,
			"release": 40.0
		}
	});

    // Allow us to offset the scheduling to track real time
    var now = new Date();
    var secondsSinceTwelveOClock = ((now.getHours() % 12) * 60 * 60) + (now.getMinutes() * 60) + now.getSeconds() + (now.getMilliseconds() / 1000);
    console.log("Seconds since 12:00 " + secondsSinceTwelveOClock);

    // Schedule sounds
    for (var key in crossTimes) {
    	if (crossTimes.hasOwnProperty(key)) {
	      	var repeatEvery = crossTimes[key];
	      	// add firstInstance to start from current time rather than 12:00
	      	var firstInstance = secondsSinceTwelveOClock % repeatEvery;
	    	Tone.Transport.scheduleRepeat(triggerSynthFactory(key), repeatEvery, firstInstance);
    	}
    }

    /* https://stackoverflow.com/questions/10207556/how-to-pass-variable-to-anonymous-function */
    function triggerSynthFactory(key) {
    	return function() {
			triggerSynth(key);
    	}
    }
	
	// Animate clock
	$(".clock").addClass("running");

	function triggerSynth(type) {
		console.log(type);
//		var msSinceStart = Date.now() - startMs;
//		var seconds = (msSinceStart / 1000) % 60;
//		var minutes = (msSinceStart / (1000 * 60)) % 60;
//		var hours = (msSinceStart / (1000 * 60 * 60)) % 12;
		var now = new Date();
		var seconds = now.getSeconds() + (now.getMilliseconds() / 1000);
		var minutes = now.getMinutes + (seconds / 60);
		var hours = now.getHours + (minutes / 60);
		var secondsNote = (seconds / 60) * octaves * 12;
		var minutesNote = (minutes / 60) * octaves * 12;
		var hoursNote = (hours / 12) * octaves * 12;
		if (type.indexOf("s") > -1) {
			synth.triggerAttackRelease(frequency(secondsNote), 1);
			highlightHand("seconds");
		}
		if (type.indexOf("m") > -1) {
			synth.triggerAttackRelease(frequency(minutesNote), 1);
			highlightHand("minutes");
		}
		if (type.indexOf("h") > -1) {
			synth.triggerAttackRelease(frequency(hoursNote), 1);
			highlightHand("hours");
		}
	}
}

function highlightHand(hand) {
	$("." + hand).addClass("triggered");
	window.setTimeout(removeHighlightFactory(hand), 1000);
}

function removeHighlightFactory(hand) {
	return function() {
		$("." + hand).removeClass("triggered");
	}
}

/* Calculate equal temperament frequency */
function frequency(note) {
	var frequency = startFreq * Math.pow(2, note / 12);
	// It seems like without the rounding, triggerAttackRelease can fail to release for certain frequencies.
	// Update: there's still the release fail bug even so.
	// frequency = Math.round(frequency);
	console.log(frequency + " Hz for note " + note);
	return frequency;
}