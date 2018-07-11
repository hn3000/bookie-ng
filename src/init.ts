
import * as cm from 'codemirror';
import * as ts from 'typescript';

import * as uglify from 'uglify-js';
import * as coffeescript from 'coffeescript';
import * as jshint from 'jshint';

export enum MimeType {
  HTML = 'text/html',
  CSS = 'text/css',
  SCRIPT = 'application/ecmascript'
}

declare function require(name:string): any;

require('codemirror/lib/codemirror.css');


let codeCM: cm.Editor;
let output: HTMLElement;
let bookmark: HTMLAnchorElement;

let contents = {
  code: '',
  jsText: ''
};

export default function init() {

  const codeTA = document.getElementById('code') as HTMLTextAreaElement;
  output = document.getElementById('output')!;
  bookmark = document.getElementById('bookmark') as HTMLAnchorElement;

  codeCM = cm.fromTextArea(
    codeTA,
    {
      lineNumbers: true,
      mode: 'typescript',
      extraKeys : {
        'Ctrl-Space' : 'autocomplete'
      }
    }
  );

  contents = JSON.parse(localStorage.getItem('bookie3.contents') || '{ "code": "" }');
  if (contents.code) codeCM.setValue(contents.code);

	codeCM.on("cursorActivity", function() {
    //codeCM.matchHighlight("CodeMirror-matchhighlight");
	});

  let pending;
	codeCM.on('change', function() {
		if (pending)
			clearTimeout(pending);
		pending = setTimeout(updateCode, 400);
	});

  console.log('init done');
}

/*
const host: ts.LanguageServiceHost = {
  getScriptFileNames() { return [ 'index.ts' ]; },
  getCompilationSettings() { return { }; },
  getCurrentDirectory() { return '.'; },
  getDefaultLibFileName(options) { return 'dom' },
  getScriptSnapshot(fileName: string) { },
  getScriptVersion(fileName) { return '1'; }
};
const service = ts.createLanguageService(host);
*/

const options : ts.TranspileOptions = {
  compilerOptions: {
    noImplicitAny: true
  },
  reportDiagnostics: true,
  fileName: 'index.ts'
};

function makeBlobURI(x: string, type = 'text/html') {
  let blob = new Blob([x], {type});
  return URL.createObjectURL(blob);
}

function makeDataURI(x: string, type = 'text/html') {
  let url = `data:${type};charset=utf-8;base64,${btoa(x)}`;
  return url;
}

function updateCode(cm: cm.Editor, change: cm.EditorChangeLinkedList) {
  const code = cm.getValue();
  console.log('updated code', code);
  contents.code = code;
  const js = ts.transpileModule(code, options);

  const jsOutput = document.getElementById('js-output') as HTMLElement;
  let outputText = js.outputText;
  contents.jsText = outputText;

  if (js.diagnostics) {
    for (const d of js.diagnostics) {
      outputText = `${d.messageText}\n` + outputText;
    }
  }
  jsOutput.innerHTML = escapeHTML(outputText);

  updated();
  //console.log(outputText);
}


function escapeHTML(html) {
  return html.replace(/>/g, '&gt;').replace(/</g, '&lt;')
}

var reIIFE = /(?:\/\/|#).*iife.*/;
var reTITLE = /(?:\/\/|#).*title:(.*?)(\/\/|\r|\n)/;
var reCOFFEE = /^#.*/;

var marks = [] as cm.TextMarker[], errLine;

function updated() {
  const editor = codeCM;
  var txt = editor.getValue(),
      isCoffee = !!txt.match(reCOFFEE);

  if ((editor.getOption('mode') == 'typescript') != !isCoffee) {
    editor.setOption('mode', isCoffee ? 'coffeescript' : 'typescript');
  }

  if (uglify) {
    let iifeMatch: RegExpExecArray|null = null;
    let titleMatch: RegExpExecArray|null = null;
    try {
      let code = contents.code; //isCoffee ? CoffeeScript.compile(txt) : txt,

      if (isCoffee) {
        code = coffeescript.compile(code);
      } else {
        
      }

      iifeMatch = reIIFE.exec(txt),
      titleMatch = reTITLE.exec(txt);
      let title: string, out: string, href: string, hash: string;

      if (titleMatch) {
        title = titleMatch[1];
      } else {
        title = "Link";
      }

      hash = encodeURIComponent(txt);
          bookmark.innerHTML = '<a href="#' + hash + '">(Save)</a>';
          //location.hash = '#' +hash;

      if (errLine) {
        editor.addLineClass(errLine, "", "");
        errLine = null;
      }
      for ( var i = 0; i < marks.length; ++i) {
        marks[i].clear();
      }

      marks.length = 0;

      if (!jshint(code)) {

        output.innerHTML = jshint.report(false);
      } else {
        if (iifeMatch) {
          code = [ '(function(){', code, '})();' ].join('\n');
        }
        let minifyOut = uglify.minify(code);
//					href = encodeURI(out);
        out = minifyOut.code;
        href = out;
        href = href.replace(/%/g, '%25');
        href = href.replace(/"/g, '%22');
        output.innerHTML = (
          (isCoffee ? '<div><small>(Coffeescript detected)</small></div>' : '')
              + '<a href="javascript:' + href
          + '">'+(title?title:'Link')+'</a> (click to run / bookmark this!)'
          +'<div>' + out + '</div>'
        );
      }
    } catch (e) {
      var doc = editor.getDoc();
      var offset = iifeMatch ? 12 : 0, 
          errorPos = doc.posFromIndex(e.pos - offset);

      errLine = editor.addLineClass(errorPos.line, "", "error");

      output.innerText = '' + e.message;
    }
  }
}


console.log('init defined');
