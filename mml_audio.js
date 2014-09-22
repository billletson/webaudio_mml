"use strict";

var context = new AudioContext();
var oscillator_references = [];
var BASE = 440;
var DEFAULT_OCTAVE = 4;
var DEFAULT_TEMPO = 100;
var DEFAULT_VOLUME = 100;
var DEFAULT_LENGTH = 1;
var INTER_NOTE = 0.05;
var STATES = { OPEN: -1, NOTE : 0, REST: 1, OCTAVE: 2, VOLUME: 3, TEMPO: 4, LENGTH: 5};
var NOTES = {};
NOTES['c'] = half_steps(BASE, -9);
NOTES['c+'] = NOTES['d-'] = half_steps(BASE, -8);
NOTES['d'] = half_steps(BASE, -7);
NOTES['d+'] = NOTES['e-'] = half_steps(BASE, -6);
NOTES['e'] = half_steps(BASE, -5);
NOTES['f'] = half_steps(BASE, -4);
NOTES['f+'] = NOTES['g-'] = half_steps(BASE, -3);
NOTES['g'] = half_steps(BASE, -2);
NOTES['g+'] = NOTES['a-'] = half_steps(BASE, -1);
NOTES['a'] = BASE;
NOTES['a+'] = NOTES['b-'] = half_steps(BASE, 1);
NOTES['b'] = half_steps(BASE, 2);
var scale = {notes : NOTES,
             octave : DEFAULT_OCTAVE,
             set_octave : function(target) {
                for (var note in this.notes) {
                    this.notes[note] =  this.notes[note] * Math.pow(2, target - this.octave);
                }
                this.octave = target;
             },
             increment : function() {
                this.set_octave(this.octave + 1);
             },
             decrement : function() {
                this.set_octave(this.octave - 1);
             }
            };

function Token(type, name, value) {
	this.type = typeof type !== 'undefined' ? type : STATES.OPEN;
	this.name = typeof name !== 'undefined' ? name : "";
	this.value = typeof value !== 'undefined' ? value : "";
}

function tokenize(string) {
    var tokens = [];
    var current_token = new Token();
    var state = STATES.OPEN;
    for (var i=0; i<string.length; i++) {
        var c = string.charAt(i);
        if (state === STATES.OPEN) {
            if (c == ">") {
                tokens.push(new Token(STATES.OCTAVE, "increment", ""));
            } else if (c === "<") {
                tokens.push(new Token(STATES.OCTAVE, "decrement", ""));
            } else if (c === "r") {
                current_token.type = STATES.REST;
                state = STATES.REST;
            } else if (c === "o") {
                current_token.type = STATES.OCTAVE;
                current_token.name = "set";
                state = STATES.OCTAVE;
            } else if (c === "l") {
                current_token.type = STATES.LENGTH;
                state = STATES.LENGTH;
            } else if (c === "t") {
                current_token.type = STATES.TEMPO;
                state = STATES.TEMPO;
            } else if (c === "v") {
                current_token.type = STATES.VOLUME;
                state = STATES.VOLUME;
            } else if (c in scale.notes) {
                current_token.type = STATES.NOTE;
                current_token.name = c;
                state = STATES.NOTE;
            }
        } else if (state !== STATES.OPEN) {
            if (c === "+" || c === "-") {
                current_token.name += c
            } else if (c === ".") {
                current_token.value += c;
            } else if (c === "&") {
                current_token.value += c;
                i++; // The next character must be a note name, so skip it
                if (string.charAt(i+1) === "+" || string.charAt(i+1) === "-") {
                    i++;  // If the character after that is a sharp/flat, skip that too
                }
            } else if (isNaN(c)) {
                tokens.push(current_token);
                current_token = new Token();
                i--; // Reprocess this character
                state = STATES.OPEN;
            } else {
                current_token.value += c;
            }
        }
    }
    if(state !== STATES.OPEN) {
        tokens.push(current_token);
    }
    return tokens;
}

function play_tokens(tokens) {
    var time_position = context.currentTime;
    var empty_note_length = DEFAULT_LENGTH;
    var whole_note = 4 * 60 / DEFAULT_TEMPO;
    var volume = DEFAULT_VOLUME;
    var start_time = time_position;
    for (var i=0;i<tokens.length;i++) {
        switch (tokens[i].type) {
            case STATES.NOTE:
                var length = whole_note * value_to_whole_notes(tokens[i].value, empty_note_length);
                play(scale.notes[tokens[i].name], time_position, length, volume);
                time_position += length;
                break;
            case STATES.REST:
                time_position += whole_note * value_to_whole_notes(tokens[i].value, empty_note_length);
                break;
            case STATES.OCTAVE:
                switch (tokens[i].name) {
                    case "increment":
                        scale.increment();
                        break;
                    case "decrement":
                        scale.decrement();
                        break;
                    case "set":
                        scale.set_octave(parseInt(tokens[i].value));
                        break;
                    default:
                        console.log("Bad Token:");
                        console.log(tokens[i]);
                }
                break;
            case STATES.LENGTH:
                empty_note_length = parseInt(tokens[i].value);
                break;
            case STATES.TEMPO:
                whole_note = 4 * 60 / parseInt(tokens[i].value);
                break;
            case STATES.VOLUME:
                volume = parseInt(tokens[i].value);
                break;
            default:
                console.log("Bad Token:");
                console.log(tokens[i]);
        }
        
    }
    scale.set_octave(DEFAULT_OCTAVE);
}

function value_to_whole_notes(value, empty_note_length) {
    var accumulator = 0;
    var notes = value.split("&");
    for (var i=0;i<notes.length;i++) {
        var pieces = notes[i].split(".");
        if (pieces[0] === "") {
            pieces[0] = empty_note_length;
        }
        accumulator += (1 / parseInt(pieces[0])) * (0.5 + 0.5 * pieces.length); // Times 1.5 if dotted, 1 if not
    }
    return accumulator;
}

function play_string(string) {
    var tracks_str = string.split(",");
    tracks_str.map(tokenize).map(play_tokens);
}

function half_steps(frequency, steps) {
    return frequency * Math.pow(2, (steps/12));
}

function play(frequency, start, duration, volume) {
    var osc = context.createOscillator();
    var gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume / 100, start + INTER_NOTE);
    gain.gain.linearRampToValueAtTime(volume / 100, start + duration - INTER_NOTE);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    osc.frequency.value = frequency;
    osc.start(start);
    osc.stop(start + duration + INTER_NOTE);
    osc.onended = function() {this.disconnect();};
    oscillator_references.push(osc);
}

function submit_MML(element_id) {
    var element = document.getElementById(element_id);
    play_string(element.value);
}

function stop_playback() {
    for (var i=0;i<oscillator_references.length;i++) {
        oscillator_references[i].disconnect();
    }
    oscillator_references = [];
}
