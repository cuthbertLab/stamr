var debug = true;
var useJsonP = false;

require.config({
    paths: {
        jquery: '//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min',
    },
    packages: [
        {
            name: 'music21',
            location: '/music21j/src', // default 'packagename'
            main: 'music21', // default 'main'
        },
    ],
});

require(['music21', 'feedback'], function() {
    console.log('loaded');
    var common = music21.common;
    var handleTNNotation = function() {
        var mainTN = $('#mainSearch').val();
        try {
            var tnStream = music21.tinyNotation.TinyNotation(mainTN);
            tnStream.replaceCanvas('#mainSearchCanvasContainer');
        } catch (e) {
            feedback.alert(e);
        }
    };

    let lastSearch = undefined;
    let lastOctave = undefined;
    let lastModal = undefined;
    var handleTNSearch = function() {
        var searchValue = $('#mainSearch').val();
        var octaveEquiv = $('#octaveEquivalent')[0].checked;
        var modal = $('#modalTransposition')[0].checked;

        if (
            searchValue == lastSearch &&
            octaveEquiv == lastOctave &&
            modal == lastModal
        ) {
            return;
        } else {
            lastSearch = searchValue;
            lastOctave = octaveEquiv;
            lastModal = modal;
        }
        var $msr = $('#mainSearchResultsContainer');
        $msr.html('<p>Searching...</p>');

        makeAjax(
            {
                query: searchValue,
                octaveEquivalent: octaveEquiv,
                modalTransposition: modal,
            },
            {
                success: function(jsonData) {
                    var $msr = $('#mainSearchResultsContainer');
                    $msr.empty();
                    var maxToShow = 20;
                    if (jsonData.length === 0) {
                        $msr.append($('<p>No results.</p>'));
                    }

                    for (var i = 0; i < jsonData.length; i++) {
                        var pi = jsonData[i];
                        console.log(pi);
                        var piece = pi.fn;
                        piece = piece.replace('.xml', '');
                        piece = piece.replace('.mxl', '');
                        piece = piece.replace('_', ' ');
                        var partId = pi.partId;
                        var context = pi.context;
                        if (i == maxToShow) {
                            $msr.append(
                                $(
                                    '<p>Too many results. Displaying filenames only...</p>',
                                ),
                            );
                        }

                        var $hold = $(
                            '<div>' +
                                piece +
                                ' : Part ' +
                                (partId + 1).toString() +
                                '</div>',
                        );
                        if (i < maxToShow) {
                            var p = music21.tinyNotation.TinyNotation(
                                pi.tsRatio + ' ' + context,
                            );
                            var pf = p.flat;
                            for (var j = 0; j < pf.length; j++) {
                                if (
                                    j >= pi.excerptNoteStart &&
                                    j < pi.excerptNoteEnd
                                ) {
                                    pf.get(j).noteheadColor = 'red';
                                }
                            }
                            p.appendNewCanvas($hold);
                        }
                        //console.log(pi.excerptNoteStart);
                        $msr.append($hold);
                    }
                },
            },
        );
    };

    makeAjax = function(objToMakeJSON, options) {
        if (objToMakeJSON === undefined) {
            objToMakeJSON = {};
        }
        var jsonObj = JSON.stringify(objToMakeJSON);
        var params = {
            type: 'POST',
            url: 'cgi-bin/searchTN.cgi',
            data: {json: jsonObj},
            dataType: 'json',
            success: function(jsonData) {
                feedback.alert(jsonData, 'ok');
            },
            error: function(xhr, errorThrown) {
                if (debug) {
                    var $tempDiv = $(
                        "<div style='background-color: white; text-align: left; z-index: 1000'></div>",
                    );
                    var $tt = $(xhr.responseText);
                    $tempDiv.append($tt);
                    $(document.body).append($tempDiv);
                }
                feedback.alert(
                    'Got a problem! -- print this page as a PDF and email it to cuthbert@mit.edu: ' +
                        errorThrown,
                );
                console.log(xhr.responseText);
            },
        };
        if (useJsonP == true) {
            params.dataType = 'jsonp';
        }
        common.merge(params, options);
        $.ajax(params);
    };

    $('#mainSearch')
        .on('input propertychange paste', handleTNNotation)
        .on('change', handleTNSearch);
    $('#searchButton').on('click', handleTNSearch);
    handleTNNotation();
    $('.clickPopup').on('click', e => {
        const $target = $(e.target);
        const refId = $target.attr('refId');
        feedback.overlay($('#' + refId).html());
    });
});
