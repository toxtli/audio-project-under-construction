let recorder;
let visualizer;
let visualizer2;
let notesPerChord;
let fullSong = null;
let singedSong = null;
let isRecording = false;
let audioRecorded = null;
let recordingBroken = false;
const PLAYERS = {};
var midiDrums = [36, 38, 42, 46, 41, 43, 45, 49, 51];

// Chord list
var chordList = [
  ['Am', 'C' , 'G' , 'Em'],
  ['Am', 'Dm', 'C' , 'G' ],
  ['Am', 'G' , 'F' , 'E' ],
  ['Am', 'D' , 'C' , 'F' ],
  ['Am', 'F' , 'G' , 'Em'],
  ['Am', 'G' , 'Em', 'F' ],
  ['Am', 'F' , 'Dm', 'Em'],
  ['Am', 'G' , 'F' , 'Em'],
  ['Am', 'B7', 'Dm', 'E7'],
  ['Am', 'C' , 'Dm', 'G' ],
  ['Am', 'C' , 'Dm', 'F' ],
  ['Dm', 'F' , 'Am', 'G' ],
  ['Dm', 'Am', 'G' , 'F' ],
  ['Dm', 'G' , 'C' , 'Am'],
  ['Em', 'C' , 'G' , 'D' ],
  ['Em', 'Am7','C2', 'D' ],
  ['Em', 'G' , 'D' , 'A' ],
  ['Em', 'C' , 'D7', 'G' ],
  ['A' , 'Bm', 'D' , 'Em'],
  ['A' , 'E' , 'D' , 'A' ],
  ['B' , 'C#m','E' , 'F#m'],
  ['B' , 'D#m','E' , 'G#m'],
  ['C' , 'G' , 'D' , 'Em'],
  ['C' , 'G' , 'Am', 'F' ],
  ['C' , 'G' , 'Am', 'F' ],
  ['C' , 'Am', 'B7', 'Em'],
  ['D' , 'Em', 'G' , 'C'],
  ['D' , 'F',  'G' , 'C'],
  ['E' , 'F#m','A' , 'Bm'],
  ['E' , 'F#', 'G#m','A'],
  ['F' , 'Dm', 'G' , 'Am'],
  ['F' , 'Gm', 'Cm', 'D#'],
  ['F' , 'Gm', 'A#', 'C'],
  ['G' , 'Em', 'C' , 'D' ],
  ['G' , 'Am', 'C' , 'F']
];

var allNoteLetters = {
  'C': 36,
  'C#': 37,
  'D': 38,
  'D#': 39,
  'E': 40,
  'F': 41,
  'F#': 42,
  'G': 43,
  'G#': 44,
  'A': 45,
  'A#': 46,
  'B': 47,
  'Db': 37,
  'Eb': 39,
  'Gb': 42,
  'Ab': 44,
  'Bb': 46
};
var allNotes = Object.keys(allNoteLetters);

var chordsFromNote = {
  'C' : ['C','Cm','F','Fm','G#', 'Am'],
  'D' : ['D','Dm','G','Gm','A#', 'Bm'],
  'E' : ['E','Em','A','Am','C' , 'C#m'],
  'F' : ['F','Fm','B','Bm','C#', 'Dm'],
  'G' : ['G','Gm','C','Cm','D#', 'Em'],
  'A' : ['A','Am','D','Dm','F' , 'F#m'],
  'B' : ['B','Bm','E','Em','G' , 'G#m'],
  'C#': ['C#','C#m','F#','F#m','A','A#m'],
  'D#': ['D#','D#m','B','Cm','G#','G#m'],
  'F#': ['F#','F#m','B','Bm','D','D#m'],
  'G#': ['G#','G#m','E','C#','C#m','Fm'],
  'A#': ['A#','A#m','D#','D#m','F#','Gm']
}

// Multitrack
var tf;
var z1, z2;
var drumMap;
var player3;
var progSeqs;
var chordSeqs;
var programMap;
var globalReverb;
var globalLimiter;
const Z_DIM = 256;
const numSteps = 8;
const MAX_PAN = 0.2;
const MIN_DRUM = 35;
const MAX_DRUM = 81;
var sectionSize = 8;
var globalCompressor;
const STEPS_PER_QUARTER = 24;
const HUMANIZE_SECONDS = 0.01;
var chords = chordList[Math.floor(Math.random()*chordList.length)];
var numChords = chords.length;
var numTimes = sectionSize / numChords;

var chord_pitches_improv = null;
var onsets_frames_uni = null;
var drum_kit_rnn = null;
var midiRecorder = null;
var player2 = null;
var player = null;
var vae = null;
const pulsePattern = true;
const temperature = 1.1;
initModels();
initPlayers();

function generateSequence(ns, callback) {
  // Generate a throwaway sequence to get the RNN loaded so it doesn't
  // cause jank later.
  let seq = [];
  let notes = fixMaxPitch(ns.notes.map(a => a.pitch));
  for (let i in notes) {
    seq.push({ note: notes[i], time: ns.notes[i].startTime });
  }
  var chordsVals = detectChord(seq);
  var chord  = _.first(chordsVals) || Tonal.Note.pc(Tonal.Note.fromMidi(_.first(seq).note)) + 'M';
  let noteSeq = buildNoteSequence(seq);
  chord_pitches_improv.continueSequence(noteSeq, 20, temperature, [chord]).then(function (genSeq) {
    callback(seqToTickArray(genSeq));
  });
}

function toNoteSequence(pattern) {
  return mm.sequences.quantizeNoteSequence(
  {
    ticksPerQuarter: 220,
    totalTime: pattern.length / 2,
    timeSignatures: [
    {
      time: 0,
      numerator: 4,
      denominator: 4 }],
    tempos: [
    {
      time: 0,
      qpm: 120 }],
      notes: _.flatMap(pattern, function (step, index) {return (
          step.map(function (d) {return {
              pitch: midiDrums[d],
              startTime: index * 0.5,
              endTime: (index + 1) * 0.5 };}));}) }, 1);
}

function detectChord(notes) {
  notes = notes.map(function (n) {return Tonal.Note.pc(Tonal.Note.fromMidi(n.note));}).sort();
  return Tonal.PcSet.modes(notes).
  map(function (mode, i) {
    var tonic = Tonal.Note.name(notes[i]);
    var names = Tonal.Dictionary.chord.names(mode);
    return names.length ? tonic + names[0] : null;
  }).
  filter(function (x) {return x;});
}

function buildNoteSequence(seed) {
  var step = 0;
  var delayProb = pulsePattern ? 0 : 0.3;
  var notes = seed.map(function (n) {
    var dur = 1 + (Math.random() < delayProb ? 1 : 0);
    var note = {
      pitch: n.note,
      quantizedStartStep: step,
      quantizedEndStep: step + dur };

    step += dur;
    return note;
  });
  return {
    totalQuantizedSteps: _.last(notes).quantizedEndStep,
    quantizationInfo: {
      stepsPerQuarter: 1 },

    notes: notes };
}

function seqToTickArray(seq) {
  return _.flatMap(seq.notes, function (n) {return (
      [n.pitch].concat(
      pulsePattern ?
      [] :
      _.times(n.quantizedEndStep - n.quantizedStartStep - 1, function () {return null;})));});
}

btnRecord.addEventListener('click', () => {
  // Things are broken on old ios
  if (!navigator.mediaDevices) {
    recordingBroken = true;
    recordingError.hidden = false;
    btnRecord.disabled = true;
    return;
  }
  
  if (isRecording) {
    isRecording = false;
    updateRecordBtn(true);
    recorder.stop();
  } else {
    isRecording = true;
    updateRecordBtn(false);
    hideVisualizer();
    
    // Request permissions to record audio.
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
      recorder = new window.MediaRecorder(stream);
       recorder.addEventListener('dataavailable', (e) => {
         updateWorkingState(btnRecord, btnUpload);
         audioRecorded = e.data;
         requestAnimationFrame(() => requestAnimationFrame(() => transcribeFromFile(e.data)));
      });
      recorder.start();
    });
  }
});

btnTest.addEventListener('click', () => {
  // Things are broken on old ios
  // let length = 20;
  // let temperature = 1.2;
  // let seed = [[0],[],[2],[]];
  // let seedSeq = toNoteSequence(seed);
  // drum_kit_rnn.continueSequence(seedSeq, length, temperature).then((r) => {
  //   console.log(r);
  // });
  // playProgression(0, 0, 0);
  player3.start(fullSong);
});

btnTest2.addEventListener('click', () => {
  // Things are broken on old ios
  // let length = 20;
  // let temperature = 1.2;
  // let seed = [[0],[],[2],[]];
  // let seedSeq = toNoteSequence(seed);
  // drum_kit_rnn.continueSequence(seedSeq, length, temperature).then((r) => {
  //   console.log(r);
  // });
  player3.stop();
});

btnTest3.addEventListener('click', () => {  
  initMultitrack().then(() => {
    if (singedSong != null) {
      // fullSong = concatenateFrom(fullSong, singedSong, 0);
    }
    player3.start(fullSong);
  });
});

function initMultitrack() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      generateSample(z => {
        z1 = z;
        generateSample(z => {
          z2 = z;
          generateProgressions(() => {
            createSong((ns) => {
              fullSong = ns;
              console.log(fullSong);
              resolve();
            }, [], 0, 0, 0, 0);
          });
        });
      });
    }, 1000);
  });
}

fileInput.addEventListener('change', (e) => {
  recordingError.hidden = true;
  updateWorkingState(btnUpload, btnRecord);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    transcribeFromFile(e.target.files[0]);
    fileInput.value = null;
  }));
  
  return false;
});

container.addEventListener('click', () => {
  if (player.isPlaying()) {
    stopPlayer();
  } else {
    startPlayer();
  }
});

container2.addEventListener('click', () => {
  if (player.isPlaying()) {
    stopPlayer2();
  } else {
    startPlayer2();
  }
});

async function transcribeFromFile(blob) {
  hideVisualizer();
  console.log(blob);
  audioControl.src = window.URL.createObjectURL(blob);
  onsets_frames_uni.transcribeFromAudioFile(blob).then((transcribed) => {
    cleanNotes(transcribed).then((ns) => {
      PLAYERS.soundfont.loadSamples(ns).then(() => {
        visualizer = new mm.Visualizer(ns, canvas, {
            noteRGB: '255, 255, 255', 
            activeNoteRGB: '232, 69, 164', 
            pixelsPerTimeStep: window.innerWidth < 500 ? null: 80,
        });
        resetUIState();
        showVisualizer();
      });
    });
  });
}

function getNoteNumber(letter, scale) {
  return allNoteLetters[letter] + 12 * (scale - 1);
}

function getNoteLetter(number) {
  return allNotes[number % 12];
}

function getNoteScale(number) {
  return parseInt(number / 12);
}

function getExactChordsFromNotes(notes) {
  let finalChord = [];
  let trie = cloneObject(chordTrie);
  chordsFromNote[notes[0]].forEach((chord1) => {
    if (trie.hasOwnProperty(chord1)) {
      chordsFromNote[notes[1]].forEach((chord2) => {
        if (trie[chord1].hasOwnProperty(chord2)) {
          chordsFromNote[notes[2]].forEach((chord3) => {
            if (trie[chord1][chord2].hasOwnProperty(chord3)) {
              chordsFromNote[notes[3]].forEach((chord4) => {
                if (trie[chord1][chord2][chord3].hasOwnProperty(chord4)) {
                  finalChord.push([chord1,chord2,chord3,chord4]);
                }
              });
            }
          });
        }
      });
    }
  });
  return finalChord;
}

function getProbableDbChordsFromNotes(notes) {
  let finalChord = {chords:[],max:0};
  let trie = cloneObject(chordTrie);
  for (let i in trie) {
    for (let j in trie[i]) {
      for (let k in trie[i][j]) {
        for (let l in trie[i][j][k]) {
          let count = 0;
          if (chordsFromNote[notes[0]].indexOf(i) != -1)
            count++;
          if (chordsFromNote[notes[1]].indexOf(j) != -1)
            count++;
          if (chordsFromNote[notes[2]].indexOf(k) != -1)
            count++;
          if (chordsFromNote[notes[3]].indexOf(l) != -1)
            count++;
          if (count > finalChord.max) {
            finalChord.max = count;
            finalChord.chords = [];
          }
          if (count == finalChord.max) {
            finalChord.chords.push([i,j,k,l])
          }
        }
      }
    }
  }
  return finalChord;
}

function getProbableChordsFromNotes(scale, notes) {
  let chordServe = new Chordserve();
  let results = chordServe.randomSelect(scale,notes);
  return results;
}

function cleanNotes(ns) {
  return new Promise((resolve, reject) => {
    if (isvoice.checked) {
      for (let i = ns.notes.length - 1; i >= 0; i--) {
        if (ns.notes[i].pitch > 71) {
          ns.notes.splice(i, 1);
        }
      }
      ns = moveToTimeZero(ns);
      let nstemp = cloneObject(ns);
      ns2 = removeOverlapped(nstemp);
      ns2 = resizeSequence(ns2);
      generateSequence(ns, (seq) => {
        let arp = createArp(seq);
        // ns = combineSongs(ns, arp);
        resolve(ns);
      });
    } else {
      resolve(ns);
    }
  });
}

function removeOverlapped(ns) {
  if (ns.notes.length == 0)
    return ns;
  var notes = _.sortBy( ns.notes, 'startTime' );
  let range = notes[0];
  let toDelete = [];
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].startTime >= range.startTime && notes[i].startTime <= range.endTime) {
      if (notes[i].endTime <= range.endTime) {
        toDelete.push(i);
      } else {
        notes[i].startTime = range.endTime;
        range = notes[i];
      }
    } else if (notes[i].startTime < range.startTime) {
      if (notes[i].endTime > range.endTime) {
        notes[i].startTime = range.endTime;
        range = notes[i];
      } else if (notes[i].endTime <= range.endTime) {
        toDelete.push(i);
      }
    } else {
      range = notes[i];
    }
  }
  ns.totalTime = range.endTime;
  while (toDelete.length > 0) {
    notes.splice(toDelete.pop(), 1);
  }
  ns.notes = notes;
  return ns;
}

function resizeSequence(ns) {
  let octaves = parseInt(ns.totalTime / 8);
  let octavesExtra = ns.totalTime % 8;
  let quarters = parseInt(ns.totalTime / 4);
  let quartersExtra = ns.totalTime % 4;
  let silence = getAverageSilence(ns);
  let fitToTime = octaves == 0? 4 : octaves * 8;
  let ns2 = expandSequence(ns, fitToTime, silence);
  let ns3 = duplicateFrom(ns2, fitToTime);
  notesPerChord = getNotesPerChord(ns3);
  chords = getChrodFromNotes(notesPerChord);
  console.log(chords);
  visualizeSequence(ns3);
  let ns4 = mm.sequences.quantizeNoteSequence(ns3, 24);
  let ns5 = setInstrument(ns4);
  singedSong = ns5;
  // fullSong = concatenateFrom(fullSong, ns5, 0);
  return ns5;
}

function getNotesPerChord(ns) {
  var notes = [{},{},{},{}];
  var notesGlobal = {};
  let exitLocal = [];
  let exitGlobal = [];
  let cutEverySecs = 2;
  let pitchKey = '';
  for (let i in ns.notes) {
    let intStart = parseInt(parseInt(ns.notes[i].startTime) / cutEverySecs);
    let intEnd = parseInt(parseInt(ns.notes[i].endTime) / cutEverySecs);
    if (intStart < notes.length && intEnd < notes.length) {
      for (let j = intStart; j <= intEnd; j++) {
        let pitch = ns.notes[i].pitch;
        let duration = (ns.notes[i].endTime - (j * cutEverySecs)) - (ns.notes[i].startTime - (j * cutEverySecs));
        if (duration > cutEverySecs)
          duration = cutEverySecs;
        pitchKey = pitch + '';
        if (!notes[j].hasOwnProperty(pitchKey))
          notes[j][pitchKey] = 0;
        notes[j][pitchKey] += duration;
      }
    } else {
      break; 
    }
  }
  for (let i in notes) {
    exitLocal.push(_.sortBy(_.toPairs(notes[i]), 1).reverse());
    for (let j in notes[i]) {
      if (!notesGlobal.hasOwnProperty(j))
        notesGlobal[j] = 0;
      notesGlobal[j] += notes[i][j];
    }
  }
  exitGlobal = _.sortBy(_.toPairs(notesGlobal), 1).reverse();
  return {local: exitLocal, global: exitGlobal};
}

function getChrodFromNotes(notes) {
  let tonal = getNoteLetter(notes.global[0][0]);
  let scale = getNoteScale(notes.global[0][0]);
  let notesPerTime = [
    getNoteLetter(notes.local[0][0][0]),
    getNoteLetter(notes.local[1][0][0]),
    getNoteLetter(notes.local[2][0][0]),
    getNoteLetter(notes.local[3][0][0])
  ]
  let probChrods = getProbableChordsFromNotes(scale, notesPerTime);
  let finalChord = probChrods.chords[Math.floor(Math.random()*probChrods.chords.length)];
  return finalChord;
}

function setInstrument(ns) {
  for (var i in ns.notes) {
    ns.notes[i].instrument = 54;
    ns.notes[i].isDrum = false;
    ns.notes[i].program = 0;
  }
  return ns;
}

function expandSequence(ns, time, silence) {
  let length = ns.totalTime + silence;
  let diff =  time - length;
  let ratio = Math.abs(diff) / length;
  let totalTime = time;
  if (diff > 0) {
    ratio += 1;
  } else {
    ratio = 1 - ratio;
  }
  for (var i in ns.notes) {
    ns.notes[i].startTime *= ratio;
    ns.notes[i].endTime *= ratio;
    totalTime = ns.notes[i].endTime;
  }
  ns.totalTime = totalTime;
  return ns;
}

function getAverageSilence(ns) {
  let times = 0;
  let total = 0;
  if (ns.notes.length > 1) {
    let prev = ns.notes[0];
    for (let i = 1; i < ns.notes.length; i++) {
      let diff = ns.notes[i].startTime - prev.endTime;
      if (diff > 0) {
        total += diff;
        times++;
      }
      prev = ns.notes[i];
    }
    if (times > 0)
      total /= times;
  }
  return total;
}

function duplicateFrom(ns, from) {
  let totalTime = from;
  for (let i in ns.notes) {
    let note = cloneObject(ns.notes[i]);
    note.startTime += from;
    note.endTime += from;
    totalTime = note.endTime;
    ns.notes.push(note);
  }
  ns.totalTime = totalTime;
  return ns;
}

function concatenateFrom(source, ns, from) {
  let totalTime = from;
  let cloned = mm.sequences.clone(ns);
  for (let i in cloned.notes) {
    let note = cloned.notes[i];
    note.startTime += from;
    note.endTime += from;
    totalTime = note.endTime;
    source.notes.push(note);
  }
  source.totalTime = totalTime;
  return source;
}

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function visualizeSequence(ns) {
  visualizer2 = new mm.Visualizer(ns, canvas2, {
      noteRGB: '255, 255, 255', 
      activeNoteRGB: '232, 69, 164', 
      pixelsPerTimeStep: window.innerWidth < 500 ? null: 80,
  });
}

function fixMaxPitch(seq) {
  let minVal = 48;
  let minSeq = Math.min(...seq);
  if (minSeq < minVal) {
    let diff = minVal - minSeq;
    for (let i in seq) {
      seq[i] += diff;
    }
  }
  return seq;
}

function createArp(seq) {
  let notes = [];
  let time = 0;
  let duration = 0.125;
  let step = duration * 2;
  let noteSize = 8;
  let rounds = parseInt(seq.length / noteSize);
  if (rounds == 0 && seq.length >= 4) {
    rounds = 1;
    seq.length = 4;
    seq = seq.concat(seq);
  }
  seq.length = rounds * noteSize;
  seq = seq.concat(seq);
  for (let i in seq) {
    notes.push({pitch: seq[i], startTime: time, endTime: time + duration, velocity: 60});
    time += step;
  }
  let newSeq = new mm.NoteSequence({notes: notes, totalTime: time});
  return newSeq;
}

function combineSongs(song1, song2) {
  let notes = [];
  while (song1.notes.length != 0 || song2.notes.length !=0) {
    if (song1.notes.length > 0 && song2.notes.length > 0) {
      if (song1.notes[0].startTime < song2.notes[0].startTime) {
        notes.push(song1.notes.shift());
      } else {
        notes.push(song2.notes.shift());
      }
    } else if (song1.notes.length > 0) {
      notes.push(song1.notes.shift());
    } else if (song2.notes.length > 0) {
      notes.push(song2.notes.shift());
    }
  }
  let totalTime = song1.totalTime>song2.totalTime?song1.totalTime:song2.totalTime;
  let newSeq = new mm.NoteSequence({notes: notes, totalTime: totalTime})
  return newSeq;
}

function moveToTimeZero(ns) {
  if (ns.notes.length > 0) {
    let startTime = ns.notes.reduce((min, p) => p.y < min ? p.y : min, ns.notes[0].startTime);
    let endTime = 0;
    for (let i in ns.notes) {
      ns.notes[i].startTime -= startTime;
      if (ns.notes[i].startTime < 0)
        ns.notes[i].startTime = 0
      ns.notes[i].endTime -= startTime;
      if (ns.notes[i].endTime > endTime)
        endTime = ns.notes[i].endTime;
    }
    ns.totalTime = endTime;
  }
  return ns;
}

function setActivePlayer(event, isSynthPlayer) {
  document.querySelector('button.player.active').classList.remove('active');
  event.target.classList.add('active');
  stopPlayer();
  player = isSynthPlayer ? PLAYERS.synth : PLAYERS.soundfont;
  startPlayer();
}

function stopPlayer() {
  player.stop();
  container.classList.remove('playing');
}

function startPlayer() {
  container.scrollLeft = 0;
  container.classList.add('playing');
  player.start(visualizer.noteSequence);
}

function stopPlayer2() {
  player2.stop();
  container2.classList.remove('playing');
}

function startPlayer2() {
  container2.scrollLeft = 0;
  container2.classList.add('playing');
  player2.start(visualizer2.noteSequence);
}

function updateWorkingState(active, inactive) {
  help.hidden = true;
  transcribingMessage.hidden = false;
  active.classList.add('working');
  inactive.setAttribute('disabled', true);
}

function updateRecordBtn(defaultState) {
  const el = btnRecord.firstElementChild;
  el.textContent = defaultState ? 'Record audio' : 'Stop'; 
}

function resetUIState() {
  btnUpload.classList.remove('working');
  btnUpload.removeAttribute('disabled');
  btnRecord.classList.remove('working');
  if (!recordingBroken) {
    btnRecord.removeAttribute('disabled');
  }
}

function hideVisualizer() {
  players.hidden = true;
  saveBtn.hidden = true;
  container.hidden = true;
}

function showVisualizer() {
  container.hidden = false;
  saveBtn.hidden = false;
  players.hidden = false;
  transcribingMessage.hidden = true;
  help.hidden = true;
}

function saveMidi(event) {
  event.stopImmediatePropagation();
  saveAs(new File([mm.sequenceProtoToMidi(visualizer.noteSequence)], 'transcription.mid'));
}

function initPlayers() {
  PLAYERS.synth = new mm.Player(false, {
    run: (note) => {
      const currentNotePosition = visualizer.redraw(note);

      // See if we need to scroll the container.
      const containerWidth = container.getBoundingClientRect().width;
      if (currentNotePosition > (container.scrollLeft + containerWidth)) {
        container.scrollLeft = currentNotePosition - 20;
      }
    },
    stop: () => {container.classList.remove('playing')}
  });

  PLAYERS.soundfont = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
  // TODO: fix this after magenta 1.1.15
  PLAYERS.soundfont.callbackObject = {
    run: (note) => {
      const currentNotePosition = visualizer.redraw(note);

      // See if we need to scroll the container.
      const containerWidth = container.getBoundingClientRect().width;
      if (currentNotePosition > (container.scrollLeft + containerWidth)) {
        container.scrollLeft = currentNotePosition - 20;
      }
    },
    stop: () => {container.classList.remove('playing')}
  };

  PLAYERS.soundfont2 = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
  // TODO: fix this after magenta 1.1.15
  PLAYERS.soundfont2.callbackObject = {
    run: (note) => {
      const currentNotePosition = visualizer2.redraw(note);

      // See if we need to scroll the container.
      const containerWidth = container2.getBoundingClientRect().width;
      if (currentNotePosition > (container2.scrollLeft + containerWidth)) {
        container2.scrollLeft = currentNotePosition - 20;
      }
    },
    stop: () => {container2.classList.remove('playing')}
  };

  player = PLAYERS.soundfont;
  player2 = PLAYERS.soundfont2;
}

function loadMultitrack() {
  globalCompressor = new mm.Player.tone.MultibandCompressor();
  globalReverb = new mm.Player.tone.Freeverb(0.25);
  globalLimiter = new mm.Player.tone.Limiter();

  globalCompressor.connect(globalReverb);
  globalReverb.connect(globalLimiter);
  globalLimiter.connect(mm.Player.tone.Master);

  programMap = new Map();
  for (let i=0; i<128; i++) {
    const programCompressor = new mm.Player.tone.Compressor();
    const pan = 2 * MAX_PAN * Math.random() - MAX_PAN;
    const programPanner = new mm.Player.tone.Panner(pan);  
    programMap.set(i, programCompressor);
    programCompressor.connect(programPanner);
    programPanner.connect(globalCompressor);
  }

  drumMap = new Map();
  for (let i=MIN_DRUM; i<=MAX_DRUM; i++) {
    const drumCompressor = new mm.Player.tone.Compressor();
    const pan = 2 * MAX_PAN * Math.random() - MAX_PAN;
    const drumPanner = new mm.Player.tone.Panner(pan);
    drumMap.set(i, drumCompressor);
    drumCompressor.connect(drumPanner);  
    drumPanner.connect(globalCompressor);
  }
}

function initModels() {
  tf = mm.tf;
  onsets_frames_uni = new mm.OnsetsAndFrames('https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni');
  chord_pitches_improv = new mm.MusicRNN('https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/chord_pitches_improv');
  drum_kit_rnn = new mm.MusicRNN('https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/drum_kit_rnn');
  vae = new mm.MusicVAE('https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_vae/drums_2bar_hikl_small');
  multitrack_chords = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/multitrack_chords');
  midiRecorder = new mm.Recorder();
  loadMultitrack();
  player3 = new mm.SoundFontPlayer('https://storage.googleapis.com/download.magenta.tensorflow.org/soundfonts_js/sgm_plus', globalCompressor, programMap, drumMap);
  Promise.all([
    onsets_frames_uni.initialize(),
    chord_pitches_improv.initialize(),
    midiRecorder.initialize(),
    multitrack_chords.initialize(),
    initMultitrack()
    //vae.initialize(),
    //drum_kit_rnn.initialize()
  ]).then(() => {
      resetUIState();
      modelLoading.hidden = true;
      modelReady.hidden = false;
      container.hidden = false;
  });
  
  // Things are slow on Safari.
  if (window.webkitOfflineAudioContext) {
    safariWarning.hidden = false;
  }
  
  // Things are very broken on ios12.
  if (navigator.userAgent.indexOf('iPhone OS 12_0') >= 0) {
    iosError.hidden = false;
    buttons.hidden = true;
  }
}

startStreamBtn.addEventListener('click', () => {
  midiRecorder.callbackObject = {
    run: (seq) => {
      if (seq) {
        visualizer = new mm.Visualizer(seq, canvas, {
            noteRGB: '255, 255, 255', 
            activeNoteRGB: '232, 69, 164', 
            pixelsPerTimeStep: window.innerWidth < 500 ? null: 80,
        });
      }
    }
  };
  startStreamBtn.textContent = '...';
  midiRecorder.start();
});

stopStreamBtn.addEventListener('click', () => {
  startStreamBtn.textContent = 'Record';
  const seq = midiRecorder.stop();
  if (seq) {
    let ns = mm.sequences.clone(seq);
    resizeSequence(ns);
    // writeNoteSeqs('streamOutput', [seq]);
  }
});

var synth = new Tone.Synth({
  "oscillator" : {
    "type" : "amtriangle",
    "harmonicity" : 0.5,
    "modulationType" : "sine"
  },
  "envelope" : {
    "attackCurve" : 'exponential',
    "attack" : 0.05,
    "decay" : 0.2,
    "sustain" : 0.2,
    "release" : 1.5,
  },
  "portamento" : 0.05
}).toMaster();

WebMidi.enable(function (err) {
  if (err) {
    console.log("WebMidi could not be enabled.", err);
    return;
  }
  console.log("WebMidi enabled!");
  console.log(WebMidi.outputs);
  console.log(WebMidi.inputs);
  if (WebMidi.inputs.length > 0) {
    var input = WebMidi.inputs[0];
    input.addListener('noteon', 1, function (e) {
      console.log(e);
      //let note = e.note.number
      let note = e.note.name + e.note.octave;
      //synth.triggerAttack(note);
      nsynthPlayer.noteOn(e.note.number);
    });
    input.addListener('noteoff', 1, function (e) {
      //synth.triggerRelease();
      nsynthPlayer.noteOff(e.note.number);

    });
  }
});

function NSynthLoaded(urls) {
  //console.log(urls);
}

function generateSample(doneCallback) {
  const z = tf.randomNormal([1, Z_DIM]);
  z.data().then(zArray => {
    z.dispose();
    doneCallback(zArray);
  });
}

// Generate chord progression for each alpha.
function generateProgressions(doneCallback) {
  let temp = [];
  for (let i=0; i<numSteps; i++) {
    temp.push([]);
  }
  generateInterpolations(0, temp, seqs => {
    chordSeqs = seqs;
    concatSeqs = chordSeqs.map(s => concatenateSequences(s));
    progSeqs = concatSeqs.map(seq => {
      const mergedSeq = mm.sequences.mergeInstruments(seq);
      const progSeq = mm.sequences.unquantizeSequence(mergedSeq);
      progSeq.ticksPerQuarter = STEPS_PER_QUARTER;
      return progSeq;
    });
    
    const fullSeq = concatenateSequences(concatSeqs);
    const mergedFullSeq = mm.sequences.mergeInstruments(fullSeq);

    setLoadingState();
    player3.loadSamples(mergedFullSeq)
      .then(doneCallback);
  });  
}

// Interpolate the two styles for a single chord.
function interpolateSamples(chord, doneCallback) {
  const z1Tensor = tf.tensor2d(z1, [1, Z_DIM]);
  const z2Tensor = tf.tensor2d(z2, [1, Z_DIM]);
  const zInterp = slerp(z1Tensor, z2Tensor, numSteps);
  
  multitrack_chords.decode(zInterp, undefined, [chord], STEPS_PER_QUARTER)
    .then(sequences => doneCallback(sequences));
}

// Construct spherical linear interpolation tensor.
function slerp(z1, z2, n) {
  const norm1 = tf.norm(z1);
  const norm2 = tf.norm(z2);
  const omega = tf.acos(tf.matMul(tf.div(z1, norm1),
                                  tf.div(z2, norm2),
                                  false, true));
  const sinOmega = tf.sin(omega);
  const t1 = tf.linspace(1, 0, n);
  const t2 = tf.linspace(0, 1, n);
  const alpha1 = tf.div(tf.sin(tf.mul(t1, omega)), sinOmega).as2D(n, 1);
  const alpha2 = tf.div(tf.sin(tf.mul(t2, omega)), sinOmega).as2D(n, 1);
  const z = tf.add(tf.mul(alpha1, z1), tf.mul(alpha2, z2));
  return z;
}

// Generate interpolations for all chords.
function generateInterpolations(chordIndex, result, doneCallback) {
  if (chordIndex === numChords) {
    doneCallback(result);
  } else {
    interpolateSamples(chords[chordIndex], seqs => {
      for (let i=0; i<numSteps; i++) {
        result[i].push(seqs[i]);
      }
      generateInterpolations(chordIndex + 1, result, doneCallback);
    })
  }
}

// Concatenate multiple NoteSequence objects.
function concatenateSequences(seqs) {
  const seq = mm.sequences.clone(seqs[0]);
  let numSteps = seqs[0].totalQuantizedSteps;
  for (let i=1; i<seqs.length; i++) {
    const s = mm.sequences.clone(seqs[i]);
    s.notes.forEach(note => {
      note.quantizedStartStep += numSteps;
      note.quantizedEndStep += numSteps;
      seq.notes.push(note);
    });
    numSteps += s.totalQuantizedSteps;
  }
  seq.totalQuantizedSteps = numSteps;
  return seq;
}

// Set UI state to updating instruments.
function setLoadingState() {
  console.log('setLoadingState');
}

// Set UI state to playing.
function setStoppedState() {
  console.log('setStoppedState');
}

// Randomly adjust note times.
function humanize(s) {
  const seq = mm.sequences.clone(s);
  seq.notes.forEach((note) => {
    let offset = HUMANIZE_SECONDS * (Math.random() - 0.5);
    if (seq.notes.startTime + offset < 0) {
      offset = -seq.notes.startTime;
    }
    if (seq.notes.endTime > seq.totalTime) {
      offset = seq.totalTime - seq.notes.endTime;
    }
    seq.notes.startTime += offset;
    seq.notes.endTime += offset;
  });
  return seq;
}

function createSong(callback, ns, idx, chordIdx, times, second) {
  const unquantizedSeq = mm.sequences.unquantizeSequence(chordSeqs[idx][chordIdx]);
  let humanized = humanize(unquantizedSeq);
  ns.push(humanized);
  second += 2;
  if (chordIdx == (numChords - 1)) {
    times = (times + 1) % numTimes;
    if (times == 0) {
      idx = (idx + 1) % numSteps;  
    }
  }
  chordIdx = (chordIdx + 1) % numChords;
  if (idx == 0 && chordIdx == 0 && times == 0) {
    ns = concatenateSequences(ns);
    callback(ns);
  } else {
    createSong(callback, ns, idx, chordIdx, times, second);
  }
}

// Play the interpolated sequence for the current slider position.
function playProgression(idx, chordIdx, times) {  
  const unquantizedSeq = mm.sequences.unquantizeSequence(chordSeqs[idx][chordIdx]);
  let humanized = humanize(unquantizedSeq);
  player3.start(humanized)
    .then(() => {
      if (chordIdx == (numChords - 1)) {
        times = (times + 1) % numTimes;
        if (times == 0) {
          idx = (idx + 1) % numSteps;  
        }
      }
      chordIdx = (chordIdx + 1) % numChords;
      playProgression(idx, chordIdx, times);
    });
}

class Chordserve {
    constructor() {

        this.keys = {
            ionian: {
                rules: "wwhwwwh"
            },
            lydian: {
                rules: "wwwhwwh"
            },
            mixolydian: {
                rules: "wwhwwww"
            },
            dorian: {
                rules: "whwwwhw"
            },
            aeolian: {
                rules: "whwwhww"
            },
            phrygian: {
                rules: "hwwwwhw"
            },
            locrian: {
                rules: "hwwhxhw"
            },
            harmonic_minor: {
                rules: "whwwhxh"
            },
            melodic_minor: {
                rules: "whwwwwh"
            },
            major_pentatonic: {
               rules: "wwxwx" 
            },
            minor_pentatonic: {
                rules: "xwwxw"
            },
            minor_blues: {
                rules: "xwhhxw"
            }
        };

        this.intervalArr = [
            "I", "II", "III", "IV", "V", "VI", "VII"
        ];

        this.progressions = [
            //["I", "IV"],
            //["I", "IV", "V"],
            ["I", "VImin", "IImin", "V"],
            //["I", "IImin", "VImin", "IV", "V"],
            ["IIImin", "VImin", "IImin", "V"],
            ["I", "IImin", "IIImin", "IV"],
            // ["I", "V/7", "VImin", "I/5", "IV", "I/3", "IImin", "V"],
            //["Imin", "bVII"],
            ["Imin", "bVII", "bVI", "bVII"],
            ["Imin", "bVII", "bVI", "V"],
            //["Imin", "Vmin"],
            //["Imin", "IVmin"],
            //["I", "bVII"],
            //["I", "bVII", "IV"],
            //["Imin", "IV"],
            ["Imin", "IImin", "bIII", "IImin"]
        ];

        this.notes = [
            "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"
        ];
        this.key_notes = [];
    }

    createTriad(rootNote, addTriad) {
        var triad = []
        console.log(rootNote);
        var key_notes = this.generateKey(rootNote, "major");
        triad.push(rootNote);
        triad.push(key_notes[3-1])
        triad.push(key_notes[5-1])

        var extraN = null;
        var noteIndex = null;

        if(addTriad === "min"){
            var n = triad[1]
            noteIndex = this.notes.indexOf(n);
            if (noteIndex > 0) {
                noteIndex--;
            } else {
                noteIndex = this.notes.length - 1;
            }
            triad[1] = this.notes[noteIndex];
        }

        if(addTriad === "7" && key_notes.length >= 7) {
           extraN = key_notes[7-1];
           noteIndex = this.notes.indexOf(extraN);
           if (noteIndex > 0) {
               noteIndex--;
           } else {
               noteIndex = this.notes.length - 1;
           }
           triad.push(noteIndex);
        }

        if(addTriad === "M7" && key_notes.length >= 7) {
           extraN = key_notes[7-1];
           noteIndex = this.notes.indexOf(extraN);
           triad.push(noteIndex);
        }

        return triad;
    }

    convertIntervalToChord(interval, keyNotes) {
        var accidentals = ["b", "#", "7", "M7", "min"];
        var usedAcc = [];
        var parsedInterval = interval;
        accidentals.map(i => {
            if (parsedInterval.indexOf(i) > -1)
                usedAcc.push(i)
            parsedInterval = parsedInterval.replace(i, "")
            return null;
        })

        console.log("parsedInt", parsedInterval);
        var intervalIndex = this.intervalArr.indexOf(parsedInterval);
        // intervalIndex += 1
        if(usedAcc.indexOf("b") > 0) {
            if (intervalIndex === 0) {
                intervalIndex--;
            } else {
                intervalIndex = this.intervalArr.length - 1;
            }
        } 
        if(usedAcc.indexOf("#") >= 0) {
            if (intervalIndex === (this.intervalArr.length - 1)) {
                intervalIndex++;
            } else {
                intervalIndex = this.intervalArr.length - 1;
            }
        }

        var addTriad = "";
        accidentals.slice(2).forEach((acc, idx, arr) => {
            if(usedAcc.indexOf(acc) >= 0) {
                addTriad = acc;
                return
            } 
        })
        console.log("interval", interval);
        console.log("intIndx", intervalIndex);
        console.log("kNotes", keyNotes);
        var rootNote = keyNotes[intervalIndex];
        console.log("rootNote", rootNote);
        if (rootNote === undefined) {
            return null;
        } else {
            var triad = this.createTriad(rootNote, addTriad)
            return [interval, triad]
        }
    }

    toTitleCase(str) {
        return str.toLowerCase()
          .split(' ')
          .map(i => i[0].toUpperCase() + i.substring(1))
          .join(' ')
    }

    convertToKeyIndex(keyString) {
        return keyString.toLowerCase().split(' ').join('_');
    }

    generateKey(note, key) {
        console.log("Note", note);
        console.log("Key", key);
        note = note.length === 1 ? note.toUpperCase() : this.toTitleCase(note);
        console.log("Note", note);
        var key_notes = [note];
        var root_index = this.notes.indexOf(note)
        var index = root_index

        let key_index = this.convertToKeyIndex(key);
        if (key_index === 'minor') {
            key_index = 'aeolian';
        }
        if (key_index === 'major') {
            key_index = 'ionian';
        }
        var k = this.keys[key_index];
        console.log(this.keys, key_index);
        // generate notes and chords
        // first notes
        var dist;
        for(var step of Array.from(k.rules)) {
            console.log("Step", step);
            if (step === "w") {
                dist = 2
            } else if (step === "h") {
                dist = 1
            } else if (step === "x") {
                dist = 3
            }

            var new_index = index + dist
            if (new_index >= this.notes.length) {
                index = new_index - this.notes.length;
            } else {
                index = new_index
            }

            key_notes.push(this.notes[index])
        }

        return key_notes;

    }

    randomSelect(note, extras) {
        // on select key
        var max = 0;
        var exit = [];
        var notesArr = this.notes;
        //var note = notesArr[Math.floor(Math.random() * notesArr.length)];
        let keyList = Object.keys(this.keys);
        for (let scale of keyList) {
            //var scale = keyList[Math.floor(Math.random() * keyList.length)];
            let key_notes = this.generateKey(note, scale);
            for (let randomProg of this.progressions) {
                //var randomProg = this.progressions[Math.floor(Math.random() * this.progressions.length)];
                var progressionObj = [];
                // go through intervals
                for (let interval of randomProg) {
                    var results = this.convertIntervalToChord(interval, key_notes);
                    if (results != null) {
                        console.log(results);
                        var triad = results[1];
                        var chord = triad[0];
                        if (interval.indexOf('min') != -1) {
                            chord += 'm';
                        }
                        progressionObj.push([interval,triad,chord]);
                    }              
                }
                if (progressionObj.length == 4) {
                    console.log(progressionObj);
                    let cont = 0;
                    if (progressionObj[0][1].indexOf(extras[0]) != -1)
                       cont++;
                    if (progressionObj[1][1].indexOf(extras[1]) != -1)
                       cont++;
                    if (progressionObj[2][1].indexOf(extras[2]) != -1)
                       cont++;
                    if (progressionObj[3][1].indexOf(extras[3]) != -1)
                       cont++;
                    if (cont > max) {
                        exit = [];
                        max = cont;
                    }
                    if (cont == max) {
                        exit.push([
                          progressionObj[0][2],
                          progressionObj[1][2],
                          progressionObj[2][2],
                          progressionObj[3][2]
                        ]);
                    }
                }
            }
        }
        return exit;
    }

}
