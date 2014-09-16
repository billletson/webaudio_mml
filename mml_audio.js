"use strict";

var context = new AudioContext();
var BASE = 440;
var DEFAULT_OCTAVE = 4;
var WHOLE_NOTE = 4*60/100;
var INTER_NOTE = WHOLE_NOTE / 64;
var STATES = { OPEN: -1, NOTE : 0, REST: 1, OCTAVE: 2 };
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
	this.value = typeof value !== 'undefined' ? value : 1;
}

function tokenize(string) {
    var tokens = [];
    var current_token = new Token();
    var state = STATES.OPEN;
    var numeric_string = "";
    for (var i=0; i<string.length; i++) {
        var c = string.charAt(i);
        if (state === STATES.OPEN) {
            if (c == ">") {
                tokens.push(new Token(STATES.OCTAVE, "increment", 0));
            } else if (c === "<") {
                tokens.push(new Token(STATES.OCTAVE, "decrement", 0));
            } else if (c === "r") {
                current_token.type = STATES.REST;
                state = STATES.REST;
            } else if (c === "o") {
                current_token.type = STATES.OCTAVE;
                current_token.name = "set";
                state = STATES.OCTAVE;
            } else if (c in NOTES) {
                current_token.type = STATES.NOTE;
                current_token.name = c;
                state = STATES.NOTE;
            }
        } else if (state === STATES.REST || state === STATES.NOTE || state === STATES.OCTAVE) {
            if (c === "+" || c === "-") {
                current_token.name += c
            } else if (c === ".") {
                current_token.value = parseInt(numeric_string) / 1.5;
                numeric_string = "";
            } else if (isNaN(c)) {
                if(numeric_string) {
                    current_token.value = parseInt(numeric_string);
                    numeric_string = "";
                }                
                tokens.push(current_token);
                current_token = new Token();
                i--; // Reprocess this character
                state = STATES.OPEN;
            } else {
                numeric_string += c;
            }
        }
    }
    if(state === STATES.REST || state === STATES.NOTE || STATES.OCTAVE) {
        if (numeric_string) {
            current_token.value = parseInt(numeric_string);
        }
        tokens.push(current_token);
    }
    return tokens;
}

function play_tokens(tokens) {
    var time_position = context.currentTime;
    for (var i=0;i<tokens.length;i++) {
        switch (tokens[i].type) {
            case STATES.NOTE:
                play(NOTES[tokens[i].name], time_position, WHOLE_NOTE / tokens[i].value);
                time_position += WHOLE_NOTE / tokens[i].value;
                break;
            case STATES.REST:
                time_position += WHOLE_NOTE / tokens[i].value;
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
                        scale.set_octave(tokens[i].value);
                        break;
                    default:
                        console.log("Bad Token:");
                        console.log(tokens[i]);
                }
                break;
            default:
                console.log("Bad Token:");
                console.log(tokens[i]);
        }
    }
    scale.set_octave(DEFAULT_OCTAVE);
}

function play_string(string) {
    play_tokens(tokenize(string));
}

function half_steps(frequency, steps) {
    return frequency * Math.pow(2, (steps/12));
}

function play(frequency, start, duration) {
    var osc = context.createOscillator();
    osc.connect(context.destination);
    osc.frequency.value = frequency;
    osc.noteOn(start);
    osc.noteOff(start + duration - INTER_NOTE);
    osc.onended = function(osc) {osc.disconnect};
}

function submit_MML(element_id) {
    var element = document.getElementById(element_id);
    console.log(element.value);
    play_string(element.value);
}
