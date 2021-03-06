// Concerto Base Libraries.
// Taehoon Moon <panarch@kaist.ac.kr>
//
// Parser
//
// Copyright Taehoon Moon 2014

Concerto.Parser = {};

/*
 musicjson --> vexflow
 Current verison only supports single staff, single voice.
*/

/**
 * @param {Array} notes
 * @return {Array}
 */
Concerto.Parser.getBeams = function(notes) {
    var beams = [];
    var temps = [];
    var note;
    for(var i = 0; i < notes.length; i++) {
        note = notes[i];
        if(!note['beam']) {
            continue;
        }
        
        var beamText = note['beam'][0]['text'];
        if(beamText == 'begin' || beamText == 'continue') {
            temps.push(note['staveNote']);
        }
        else if(beamText == 'end') {
            temps.push(note['staveNote']);
            var beam = new Vex.Flow.Beam(temps);
            temps = [];
            beams.push(beam);
        }        
    }

    return beams;
};

/**
 * @param {Array} voices
 * @param {Object} ctx
 */
Concerto.Parser.drawVoices = function(voices, ctx) {
    for(var i = 0; i < voices.length; i++) {
        var voice = voices[i][0];
        var stave = voices[i][1];
        var formatter = new Vex.Flow.Formatter();
        //formatter.joinVoices([voice]);
        //formatter.formatToStave([voice], stave);
        voice.draw(ctx, stave);
    }
};

/**
 * @param {Array} pages
 * @param {Object} musicjson
 * @return {Object}
 */
Concerto.Parser.parseAndDraw = function(pages, musicjson) {
    var parts = musicjson['part'];

    var attributesManager = new Concerto.Parser.AttributesManager();
    var layoutManager = new Concerto.Parser.LayoutManager(musicjson);
    var measureManager = new Concerto.Parser.MeasureManager(musicjson);
    
    var numMeasures = parts[0]['measure'].length;
    
    var staves;
    var voices;
    var beams;
    var curPageIndex = 0;
    layoutManager.setPageIndex(curPageIndex);

    var divisions = 1;
    var ctx = pages[curPageIndex];
    var p, i, j, k;

    for(i = 0; i < numMeasures; i++) {
        measureManager.setMeasureIndex(i);
        attributesManager.setMeasureIndex(i);
        staves = [];
        beams = [];
        voices = [];
        for(p = 0; p < parts.length; p++) {
            measureManager.setPartIndex(p);
            attributesManager.setPartIndex(p);
            var measure = parts[p]['measure'][i];
            if(measure['print'] && measure['print']['@new-page']) {
                curPageIndex++;
                layoutManager.setPageIndex(curPageIndex);
                ctx = pages[curPageIndex];
            }

            var firstMeasure = measureManager.getFirstMeasure();
            var leftMeasure = measureManager.getLeftMeasure();
            var aboveMeasure = measureManager.getAboveMeasure();

            var curStaves = layoutManager.getStaves(measure, leftMeasure, aboveMeasure, firstMeasure);
            staves = staves.concat(curStaves);
            var stave = curStaves[0];
            var stave2 = curStaves[1];
            
            measure['stave'] = stave;
            measure['stave2'] = stave2;

            // barlines
            Concerto.Parser.BarlineManager.addBarlineToStave(stave, measure['barline']);
            if(stave2) {
                Concerto.Parser.BarlineManager.addBarlineToStave(stave2, measure['barline']);    
            }
            


            var staveNotesDict = {};

            // check clef, time signature changes
            var notes = measure['note'];
            var noteManager = new Concerto.Parser.NoteManager(attributesManager);
            var note, clef;

            if(notes.length > 0) {
                note = notes[0];
                var isAttributes = (note['tag'] == 'attributes');
                var clefExists = false;
                if(isAttributes && note['clef']) {
                    // set raw clefs, and get converted clef
                    attributesManager.setClefs(note['clef'], p);
                    clefExists = true;
                }
                
                if(measure['print'] || clefExists) {
                    for(k = 0; k < curStaves.length; k++) {
                        var staff = k + 1;
                        clef = attributesManager.getClef(p, staff);
                        if(clef !== undefined) {
                            curStaves[k].addClef(clef);
                        }
                    }
                }

                if(isAttributes && note['key']) {
                    attributesManager.setKeySignature(note['key'], p, note['staff']);
                    Concerto.Parser.AttributesManager.addKeySignatureToStave(stave, note['key']);
                    if(stave2) {
                        Concerto.Parser.AttributesManager.addKeySignatureToStave(stave2, note['key']);
                    }
                }

                if(isAttributes && note['time']) {
                    attributesManager.setTimeSignature(note['time']);
                    Concerto.Parser.AttributesManager.addTimeSignatureToStave(stave, note['time']);
                    if(stave2) {
                        Concerto.Parser.AttributesManager.addTimeSignatureToStave(stave2, note['time']);
                    }
                }

                if(isAttributes && note['divisions']) {
                    attributesManager.setDivisions(note['divisions']);
                    divisions = note['divisions'];
                }    
            }

            for(j = 0; j < notes.length; j++) {
                note = notes[j];
                // backup, forward
                if(j > 0 && note['tag'] == 'attributes') {
                    // clef change,
                    if(note['clef']) {
                        attributesManager.setClefs(note['clef'], p);

                        if(note[j + 1] === undefined) {
                            Concerto.Parser.AttributesManager.addEndClefToStave(curStaves, note['clef']);
                        }
                        else {
                            var clefNote = Concerto.Parser.AttributesManager.getClefNote(note['clef']);
                            noteManager.addClefNote(clefNote, note);
                        }
                        
                    }
                }
                else if(note['tag'] == 'note') {
                    var chordNotes = [note];
                    for(k = j + 1; k < notes.length; k++) {
                        var nextNote = notes[k];
                        if(!nextNote['chord']) {
                            break;
                        }
                        else {
                            j++;
                        }
                        chordNotes.push(nextNote);
                    }
                    
                    
                    clef = attributesManager.getClef(p, note['staff'], Concerto.Table.DEFAULT_CLEF);
                    var staveNote;
                    if(note['staff'] && note['staff'] == 2) {
                        staveNote = Concerto.Parser.NoteManager.getStaveNote(chordNotes, clef, divisions);
                        noteManager.addStaveNote(staveNote, note);
                    }
                    else {
                        staveNote = Concerto.Parser.NoteManager.getStaveNote(chordNotes, clef, divisions);
                        noteManager.addStaveNote(staveNote, note);
                    }
                    
                    note['staveNote'] = staveNote;

                }
                else if(note['tag'] == 'backup') {
                    noteManager.addBackup(note['duration']);
                }
                else if(note['tag'] == 'forward') {
                    noteManager.addForward(note['duration']);
                }
            }
            
            var newBeams = Concerto.Parser.getBeams(notes);
            beams = beams.concat(newBeams);
            var newVoices = noteManager.getVoices(curStaves);
            voices = voices.concat(newVoices);

            // draw stave
            if(ctx === undefined) {
                continue;
            }
            stave.setContext(ctx).draw();
            measure['top-line-y'] = stave.getYForLine(0);
            measure['top-y'] = stave.y;
            measure['bottom-line-y'] = stave.getYForLine(stave.options.num_lines - 1);
            measure['bottom-y'] = stave.getBottomY();
            if(stave2) {
                //stave2.y = measure['bottom-line-y'] + measure['print']['staff-layout']['staff-distance'];
                stave2.setContext(ctx).draw();
                measure['bottom-line-y'] = stave2.getYForLine(stave2.options.num_lines - 1);
                measure['bottom-y'] = stave2.getBottomY();
            }
        }

        if(ctx === undefined) {
            continue;
        }
        
        // does vexflow not support multiple part formatting?
        Concerto.Parser.drawVoices(voices, ctx);

        for(j = 0; j < beams.length; j++) {
            beams[j].setContext(ctx).draw();
        }

        // draw stave connector
        // current version, multiple staff and connector shape are not supported.
        if(parts[0]['measure'][i]['print']) {
            var staveConnector = new Vex.Flow.StaveConnector(staves[0], staves[staves.length - 1]);
            staveConnector.setContext(ctx);
            staveConnector.setType(Vex.Flow.StaveConnector.type.BRACE);
            staveConnector.draw();
            staveConnector.setType(Vex.Flow.StaveConnector.type.SINGLE);
            staveConnector.draw();
        }
        
    }


    return musicjson;


};




