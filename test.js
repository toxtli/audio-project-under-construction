
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
        console.log(max);
        return exit;
    }

}

