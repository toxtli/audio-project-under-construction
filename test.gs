{
	"id": "88fb1290-76e2-4aa1-be2b-0e1dd62226bb",
	"bpm": 120,
	"stepsPerBeat": 4,
	"beatsPerMeasure": 4,
	"name": "AI Demo",
	"duration": 128,
	"patterns": {
		"p1": { "name": "piano", "type": "keys", "keys": "k1", "synth": "s0", "duration": 128 },
		"p2": { "name": "piano", "type": "keys", "keys": "k2", "synth": "s0", "duration": 128 },
		"p3": { "name": "piano", "type": "keys", "keys": "k3", "synth": "s0", "duration": 128 },
		"p4": { "name": "piano", "type": "keys", "keys": "k4", "synth": "s0", "duration": 128 },
		"p5": { "name": "piano", "type": "keys", "keys": "k5", "synth": "s0", "duration": 128 },
		"p6": { "name": "piano", "type": "keys", "keys": "k6", "synth": "s0", "duration": 128 },
		"p7": { "name": "piano", "type": "keys", "keys": "k7", "synth": "s0", "duration": 128 },
		"p8": { "name": "piano", "type": "keys", "keys": "k8", "synth": "s0", "duration": 128 }
	},
	"synths": {
		"s0": {
			"name": "piano",
			"oscillators": {
				"o1": { "order": 0, "type": "triangle", "detune": 0, "pan": -0.3, "gain": 0.46 },
				"o2": { "type": "bass4", "gain": 0.36, "pan": 0.1, "detune": 0, "order": 1 }
			}
		}
	},
	"tracks": {
		"t1": { "order": 0, "name": "piano" },
		"t2": { "order": 1, "name": "piano" },
		"t3": { "order": 2, "name": "piano" },
		"t4": { "order": 3, "name": "piano" },
		"t5": { "order": 4, "name": "piano" },
		"t6": { "order": 5, "name": "piano" },
		"t7": { "order": 6, "name": "piano" },
		"t8": { "order": 7, "name": "piano" }
	},
	"blocks": {
		"0": { "pattern": "p1", "duration": 128, "when": 0, "track": "t1" },
		"1": { "pattern": "p2", "duration": 128, "when": 0, "track": "t2" },
		"2": { "pattern": "p3", "duration": 128, "when": 0, "track": "t3" },
		"3": { "pattern": "p4", "duration": 128, "when": 0, "track": "t4" },
		"4": { "pattern": "p5", "duration": 128, "when": 0, "track": "t5" },
		"5": { "pattern": "p6", "duration": 128, "when": 0, "track": "t6" },
		"6": { "pattern": "p7", "duration": 128, "when": 0, "track": "t7" },
		"7": { "pattern": "p8", "duration": 128, "when": 0, "track": "t8" },
	},
	"keys": {
		"k1": {
			"0": { "key": 50, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k2": {
			"0": { "key": 51, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k3": {
			"0": { "key": 52, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k4": {
			"0": { "key": 53, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k5": {
			"0": { "key": 54, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k6": {
			"0": { "key": 55, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k7": {
			"0": { "key": 56, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		},
		"k8": {
			"0": { "key": 57, "pan": 0, "gain": 0.8, "duration": 1, "when": 0 }
		}
	},
	"synthOpened": "s1",
	"savedAt": 1534026524,
	"patternOpened": "p1"
}