/**
 * VexFlow Test Support Library
 * Copyright Mohit Muthanna 2010 <mohit@muthanna.com>
 */

Vex.Flow.Test = {}

Vex.Flow.Test.Font = {
    size: 10
}

Vex.Flow.Test.genID = function() {
    return Vex.Flow.Test.genID.ID++;
}
Vex.Flow.Test.genID.ID = 0;

Vex.Flow.setupCanvasArray = function() {
    return "";
}
Vex.Flow.Test.createTestCanvas = function(canvas_sel_name, test_name) {
    var sel = Vex.Flow.Test.createTestCanvas.sel;
    var test_div = $('<div></div>').addClass("testcanvas").addClass(canvas_sel_name);
    test_div.append($('<div></div>').addClass("name").text(test_name));
    test_div.append($('<canvas></canvas>').addClass("vex-tabdiv").attr("id", canvas_sel_name).addClass("name").text(name));
    $(sel).append(test_div);
}
Vex.Flow.Test.createTestCanvas.sel = "#vexflow_testoutput";

Vex.Flow.Test.createTestRaphael = function(canvas_sel_name, test_name) {
    var sel = Vex.Flow.Test.createTestCanvas.sel;
    var test_div = $('<div></div>').addClass("testcanvas").addClass(canvas_sel_name);
    test_div.append($('<div></div>').addClass("name").text(test_name));
    test_div.append($('<div></div>').addClass("vex-tabdiv").attr("id", canvas_sel_name));
    $(sel).append(test_div);
}

Vex.Flow.Test.resizeCanvas = function(sel, width, height) {
    $("#" + sel).width(width);
    $("#" + sel).attr("width", width);
    $("#" + sel).attr("height", height);
}

Vex.Flow.Test.runTest = function(name, func, params) {
    test(name, function() {

        test_canvas_sel = "canvas_" + Vex.Flow.Test.genID();
        test_canvas = Vex.Flow.Test.createTestCanvas(test_canvas_sel, name);
        func({
                canvas_sel: test_canvas_sel,
                params: params
            },
            Vex.Flow.Renderer.getCanvasContext);

    });


}

Vex.Flow.Test.runRaphaelTest = function(name, func, params) {
    test(name, function() {
        test_canvas_sel = "canvas_" + Vex.Flow.Test.genID();
        test_canvas = Vex.Flow.Test.createTestRaphael(test_canvas_sel, name);
        func({
                canvas_sel: test_canvas_sel,
                params: params
            },
            Vex.Flow.Renderer.getRaphaelContext);
        if (name == "Multiple Stave Barline Test (Raphael)") {
            Concerto.Test.createXmlTest("raphael", test_canvas_sel, name)

            Concerto.Test.runXmlTest({
                selector: test_canvas_sel,
                name: name
            })

        }
    });
}


//  Concerto Test Addons

Concerto.Test = {};


// maybe move this to concerto file
Concerto.Schema = null;

Concerto.validate = function(musicjson) {
    var valid = tv4.validate(musicjson, Concerto.Schema);

    if (valid) {
        console.log('pre-validation success');
        return true;
    } else {
        console.log(tv4.error);
        return false;
    }

}


Concerto.Test.buildXmlUrl = function(name) {
    var url;
    url = name.replace('(Canvas)', '');
    url = url.replace('(Raphael)', '');

    // removes white space at end and beginning
    function trimWhiteSpace(str) {
        str = str.replace(/^\s+/, '');
        for (var i = str.length - 1; i >= 0; i--) {
            if (/\S/.test(str.charAt(i))) {
                str = str.substring(0, i + 1);
                break;
            }
        }
        return str;
    }

    url = trimWhiteSpace(url);

    return "./XML/" + url + ".xml"
}

Concerto.Test.runXmlTest = function(options) {
    // use xml example instead of using templates.js
    var musicjson;

    if (options) {
        var url = Concerto.Test.buildXmlUrl(options.name);
        var selector = options.selector + "-xml";

    }

    // Load and bind the Schma
    if (!Concerto.Schema) {
        $.getJSON('../schema/musicjson.json', function(schema) {
            Concerto.Schema = schema;
            Concerto.Test.runXmlTest(options);
        });
        return;
    }

    $.ajax({
        url: url,
        data: null,
        success: function(data) {
            musicjson = Concerto.Converter.toJSON(data);
            Concerto.validate(musicjson);
            $("#" + selector).css('width', 1000).css('height', 1000);
            var renderer = new Vex.Flow.Renderer(selector, Vex.Flow.Renderer.Backends.RAPHAEL);
            var ctx = renderer.getContext();

            var pages = [
                ctx
            ];

            musicjson = Concerto.Parser.parseAndDraw(pages, musicjson);
            Concerto.validate(musicjson);

        },
        dataType: 'xml'
    });

}


Concerto.Test.createXmlTest = function(type, selector, test_name) {
    var test_name = test_name + " from XML";
    var canvas_sel_name = selector;
    var sel = "." + selector;
    console.log(sel);
    var test_div = $('<div></div>').addClass("xml-test");
    test_div.append($('<div></div>').addClass("name").text(test_name));
    if (type == "canvas") {
        test_div.append($('<canvas></canvas>').addClass("vex-tabdiv").attr("id", canvas_sel_name + "-xml").addClass("name").text(name));
    }
    if (type == "raphael") {
        test_div.append($('<div></div>').addClass("vex-tabdiv").attr("id", canvas_sel_name + "-xml"));
    }
    console.log(test_div);
    console.log(sel)
    $(sel).append(test_div);
}