'use babel';

import DocblockPythonView from './docblock-python-view';
import { CompositeDisposable } from 'atom';

export default {

  config: {
    indent: {
      title: 'Add initial indent',
      type: 'boolean',
      default: true
    }
  },

  docblockPythonView: null,
  modalPanel: null,
  subscriptions: null,

  template_start: ['',
    '"""Short summary.\n',
  ],
  template_end: ['\n',
    'Returns\n',
    '-------\n',
    'type\n',
    '    Description of returned object.\n\n',
  '"""\n'
  ],

  accepted_starts: ['def'],

  get_header(start, lines) {
      let editor;
      if (editor = atom.workspace.getActiveTextEditor()) {
          editor.setCursorBufferPosition(start);
          editor.moveDown(lines);
          editor.moveToEndOfLine();
          editor.selectToBufferPosition(start);
          var query = editor.getSelectedText().trim();
          if(!(/:$/.test(query))) {
              tmp = this.get_header(start, lines + 1);
              query = tmp[0];
              lines = tmp[1];
          };
      };
      return [query.replace(/\n/g, ''), lines]
  },

  fmap(callback) {
      return this.reduce((accum, ...args) => {
          let x = callback(...args);
          if(x !== undefined) {
              accum.push(x);
          }
          return accum;
      }, []);
  },

  activate(state) {
    this.docblockPythonView = new DocblockPythonView(state.docblockPythonViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.docblockPythonView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'docblock-python:generate_docblock': () => this.generate_docblock(),
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.docblockPythonView.destroy();
  },

  serialize() {
    return {
      docblockPythonViewState: this.docblockPythonView.serialize()
    };
  },

  generate_docblock() {
    let editor;
    var docblock;
    var indent = atom.config.get('docblock-python.indent');
    if (editor = atom.workspace.getActiveTextEditor()) {
      let language = editor.getGrammar().name;
      if( language === 'Python') {
          editor.moveToFirstCharacterOfLine();
          var pos = editor.getCursorBufferPosition();
          var col = pos.column;
          var tabs = '    '.repeat((col/4) + indent);
          editor.selectToEndOfLine();
          let query = editor.getSelectedText();

          var logic = this.accepted_starts.map(function(x) {
            return query.search(x)
          }).some(function(x) {return( x >= 0)});

          if(logic) {
            var header = this.get_header(pos, 0);
            query = header[0];
            var n_lines = header[1];
            var args = /\(.*\)/.exec(query);
            args = args[0].replace('(', '').replace(')', '');
            if(args) {
                args = ['\n', 'Parameters\n', '----------\n'].join(tabs) +
                      args
                     .split(',')
                     ::this.fmap(function(x) {
                        var name = x.match(/\w+/)[0]
                        if(name == 'self') {
                          return undefined
                        }
                        var lines = tabs +
                                    name +
                                    ' : type\n' +
                                    tabs +
                                    '    Description of parameter `' +
                                    name +
                                    '`.';
                        return lines
                      })
                      .join('\n') + '\n';
            };
            docblock = this.template_start.join(tabs) +
                       args +
                       this.template_end.join(tabs);
            editor.setCursorBufferPosition(pos);
            editor.moveDown(n_lines + 1);
            editor.moveToBeginningOfLine();
            editor.insertText(docblock);
          } else {
            editor.moveToBeginningOfWord();
            atom.notifications.addWarning('Nothing to do. Try selecting a line where you define a function.')
          };
      };
    }
  }

};
