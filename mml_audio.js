"use strict";

var context = new AudioContext();
var BASE = 440;
var current_octave = 4;
var WHOLE_NOTE = 4*60/100;
var INTER_NOTE = WHOLE_NOTE / 64;
var STATES = { OPEN: -1, NOTE : 0, REST: 1, OCTAVE: 2 };
var NOTES = {};
NOTES['c'] = half_steps(BASE, -9)
NOTES['c+'] = NOTES['d-'] = half_steps(BASE, -8)
NOTES['d'] = half_steps(BASE, -7)
NOTES['d+'] = NOTES['e-'] = half_steps(BASE, -6)
NOTES['e'] = half_steps(BASE, -5)
NOTES['f'] = half_steps(BASE, -4)
NOTES['f+'] = NOTES['g-'] = half_steps(BASE, -3)
NOTES['g'] = half_steps(BASE, -2)
NOTES['g+'] = NOTES['a-'] = half_steps(BASE, -1)
NOTES['a'] = BASE;
NOTES['a+'] = NOTES['b-'] = half_steps(BASE, 1)
NOTES['b'] = half_steps(BASE, 2)


function tokenize(string) {
    var tokens = [];
    var current_token = {type : STATES.OPEN, name : "", value: 1};
    var state = STATES.OPEN;
    var numeric_string = "";
    for (var i=0; i<string.length; i++) {
        var c = string.charAt(i);
        if (state === STATES.OPEN) {
            if (c == ">") {
                tokens.push({type : STATES.OCTAVE, name : "", value: 1});
            } else if (c === "<") {
                tokens.push({type : STATES.OCTAVE, name : "", value: -1});
            } else if (c === "r") {
                current_token.type = STATES.REST;
                state = STATES.REST;
            } else if (c in NOTES) {
                current_token.type = STATES.NOTE;
                current_token.name = c;
                state = STATES.NOTE;
            }
        } else if (state === STATES.REST || state === STATES.NOTE) {
            if (c === "+" || c === "-") {
                current_token.name += c
            } else if (isNaN(c)) {
                if(numeric_string) {
                    current_token.value = parseInt(numeric_string);
                    numeric_string = "";
                }                
                tokens.push(current_token);
                current_token = {type : STATES.OPEN, name : "", value: 1};
                i--; // Reprocess this character
                state = STATES.OPEN;
            } else {
                numeric_string += c;
            }
        }
    }
    if(state === STATES.REST || state === STATES.NOTE) {
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
        //console.log(NOTES);
        switch (tokens[i].type) {
            case STATES.NOTE:
                play(NOTES[tokens[i].name], time_position, WHOLE_NOTE / tokens[i].value);
                time_position += WHOLE_NOTE / tokens[i].value;
                break;
            case STATES.REST:
                time_position += WHOLE_NOTE / tokens[i].value;
                break;
            case STATES.OCTAVE:
                convert_octave(tokens[i].value);
                break;
            default:
                console.log("Bad Token:");
                console.log(tokens[i]);
        }
    }
    set_octave(4);
}

function play_string(string) {
    play_tokens(tokenize(string));
}
              
function octave(frequency, direction) {
    return frequency * Math.pow(2, direction);
}

function convert_octave(direction) {
    for (var note in NOTES) {
        NOTES[note] = octave(NOTES[note], direction);
    }
    current_octave += direction;
}

function set_octave(target) {
    while (current_octave != target) {
        if (target > current_octave) {
            convert_octave(1);
        } else if (target < current_octave) {
            convert_octave(-1);
        }
    }
}

function perfect_fifth(frequency) {
    return frequency * 3/2;
}

function major_third(frequency) {
    return frequency * 4/3;
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
