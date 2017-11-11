'use babel';

import { CompositeDisposable } from 'atom';
import packageConfig from './config.js';

export default {

  config: packageConfig,

  subscriptions: null,

  template_summary: ['',
    '"""Short summary.\n',
  ],
  template_returns: ['\n',
    'Returns\n',
    '-------\n',
    'type\n',
    '    Description of returned object.\n'
  ],
  template_raises: ['\n',
    'Raises\n',
    '-------\n',
    'ExceptionName\n',
    '    Why the exception is raised.\n'
  ],
  template_end: ['\n', '"""\n'],

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

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'docblock-python:generate_docblock': () => this.generate_docblock(),
    }));
  },

  deactivate() {

  },

  serialize() {
    return {

    };
  },

  generate_docblock() {
    let editor;
    var docblock;
    // Load settings:
    var indent = atom.config.get('docblock-python.indent');
    var parameters = atom.config.get('docblock-python.parameters');
    var use_defaults = atom.config.get('docblock-python.use_defaults');
    var returns = atom.config.get('docblock-python.returns');
    var raises = atom.config.get('docblock-python.raises');

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
                args = args.split(',')
                     ::this.fmap(function(x) {
                        var pieces = x.split('=');
                        var name = pieces[0].trim();
                        var default_value = null;
                        if(pieces.length > 1) {
                          default_value = pieces[1].trim();
                        }
                        if(name == 'self') {
                          return undefined
                        };
                        var lines = tabs +
                                    name +
                                    ' : type\n' +
                                    tabs +
                                    '    Description of parameter `' +
                                    name +
                                    '`';
                        if(use_defaults & default_value) lines += ' (the default is ' + default_value + ')';
                        lines += '.';
                        return lines
                      })
                      .join('\n') + '\n';
                if(args.length > 1) {
                  args = ['\n', 'Parameters\n', '----------\n'].join(tabs) + args;
                } else {
                  args = null;
                };
            };
            docblock = this.template_summary.join(tabs);
            if(parameters) {
              if(args) docblock += args;
            }
            if(returns) docblock += this.template_returns.join(tabs);
            if(raises) docblock += this.template_raises.join(tabs);
            docblock += this.template_end.join(tabs);

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
