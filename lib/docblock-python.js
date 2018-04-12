'use babel';

import { CompositeDisposable } from 'atom';
import packageConfig from './config.js';
import templates from './templates.js';

export default {

  config: packageConfig,

  subscriptions: null,

  options: {},
  accepted_starts: ['def', 'class'],
  stop_words: ['def'],
  ordered_sections : ['Parameters', 'Returns', 'Other Parameters', 'Raises',
                      'See Also', 'Notes', 'References', 'Examples'],

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

  format_lines(name, tabs, use_defaults, default_value, style, type) {
    if(style == 'numpy') {
      var lines = tabs +
      name +
      ' : type\n' +
      tabs +
      '    Description of ' +
      type +
      ' `' +
      name +
      '`';
      if(use_defaults && default_value) lines += ' (the default is ' + default_value + ')';
      lines += '.';
    };
    if(style == 'google') {
      var lines = tabs +
      '    ' +
      name +
      ' (type): Description of parameter `' +
      name +
      '`';
      if(use_defaults && default_value) lines += '. Defaults to ' + default_value;
      lines += '.';
    };

    return lines
  },

  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'docblock-python:generate_docblock': () => this.generate_docblock()
    //   'docblock-python:add_section_notes': () => this.add_section_notes(),
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
    var style = atom.config.get('docblock-python.style');
    var template = templates[style];

    var options = {
      indent: indent,
      parameters: parameters,
      use_defaults: use_defaults,
      returns: returns,
      raises: raises,
      style: style,
      template: template,
      tabs: ''
    }

    this.options = options;

    if (editor = atom.workspace.getActiveTextEditor()) {
      let language = editor.getGrammar().name;
      if(language === "Python" || language === "MagicPython") {
          editor.moveToFirstCharacterOfLine();
          var pos = editor.getCursorBufferPosition();
          var col = pos.column;
          var tabs = '    '.repeat((col/4) + indent);
          options.tabs = tabs;
          editor.selectToEndOfLine();
          let query = editor.getSelectedText();
          var logic = this.accepted_starts.map(function(x) {
            return query.search(x)
          }).some(function(x) {return( x >= 0)});
          if(logic) {
            var header = this.get_header(pos, 0);
            query = header[0];
            var n_lines = header[1];

            if(query.search('def') == 0) {
              var docblock = this.process_def(query, options);
            } else if(query.search('class') == 0) {
              var docblock = this.process_class(query, options, pos);
            } else {
              editor.moveToBeginningOfWord();
              atom.notifications.addWarning('Nothing to do. Try selecting a line where you define a function.')
            }

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
  },

  process_def(query, options) {
    var args = /\(.*\)/.exec(query);
    args = args[0].replace('(', '').replace(')', '');
    var tabs = options.tabs;
    var template = options.template;
    if(args) {
        var that = this;
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
                var lines = that.format_lines(name,
                                              tabs,
                                              options.use_defaults,
                                              default_value,
                                              options.style,
                                              'parameter');
                return lines
              })
              .join('\n') + '\n';
        if(args.length > 1) {
          args = template.parameters.join(tabs) + args;
        } else {
          args = null;
        };
    };
    docblock = template.summary.join(tabs);
    if(options.parameters) {
      if(args) docblock += args;
    }
    if(options.returns) docblock += template.returns.join(tabs);
    if(options.raises) docblock += template.raises.join(tabs);
    docblock += template.end.join(tabs);
    return docblock
  },

  find_init(start, lines=0) {
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      var query = editor.getSelectedText().trim();
      var done = false;
      if(!(/def __init__/.test(query))) {

        var logic = this.stop_words.map(function(x) {
          return query.search(x)
        }).some(function(x) {return( x >= 0)});

        if(logic) {
          return null
        } else {
          tmp = this.find_init(start, lines + 1);
          lines = tmp;
        };
      } else {
        done = true;
      };
    };

    if(done) {
      var pos = editor.getCursorBufferPosition();
      pos.row = pos.row + lines;
      editor.setCursorBufferPosition(pos);
      editor.moveToFirstCharacterOfLine();
      pos = editor.getCursorBufferPosition();
      editor.setCursorBufferPosition(start);
      return pos
    };

    return lines
  },

  get_init(start, lines=1) {
    let editor;
    var n_tabs = start.column / 4;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBeginningOfLine();
      var last_line = editor.getSelectedText();
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      var query = editor.getSelectedText();
      var re = new RegExp(this.options.tabs, 'g');
      if(!last_line.match(re)) {
        return query
      }
      var last_line_n_tabs = last_line.match(re).length

      if(last_line_n_tabs > n_tabs) {
        var logic = this.stop_words.map(function(x) {
          return query.search(x)
        }).some(function(x) {return( x >= 0)});

        if(logic) {
          return query
        } else {
          tmp = this.get_init(start, lines + 1);
          lines = tmp;
        };
      } else {
        return query
      };
    };
    return lines
  },

  process_list(args, options, that, label='parameter') {
    var tabs = options.tabs
    var template = options.template
    var ans = args
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
        var lines = that.format_lines(name,
                                      tabs,
                                      options.use_defaults,
                                      default_value,
                                      options.style,
                                      label);
        return lines
      })
      .join('\n') + '\n';
      return ans
  },

  process_class(query, options, pos) {
    var tabs = options.tabs;
    var template = options.template;
    var init_pos = this.find_init(pos);
    var init_header = this.get_header(init_pos, 0)[0]
    var class_options = options;
    class_options.returns = false;
    class_options.raises = false;
    var end_orig = class_options.template.end;
    class_options.template.end = [];
    var start = this.process_def(init_header, class_options);
    options.template.end = end_orig;

    init_pos.row = init_pos.row + 1;
    var attributes = this.get_init(init_pos);
    attributes = attributes.match(/self.\w+/g);
    attributes = attributes.map(function(x) {
      return x.replace('self.', '')
    })
    var long_attrs = attributes.filter(function(x) {
      return start.indexOf(x) < 0
    })
    var short_attrs = attributes.filter(function(x) {
      return start.indexOf(x) > -1
    })

    if(long_attrs) {
        var that = this;
        attrs = this.process_list(long_attrs, options, that, 'attribute');
        if(attrs.length > 1) {
          attrs = template.attributes.join(tabs) + attrs;
        } else {
          attrs = null;
        };
    };

    // if(attributes) {
    //     var that = this;
    //     args = process_list(attributes, options);
    //     if(args.length > 1) {
    //       args = template.attributes.join(tabs) + args;
    //     } else {
    //       args = null;
    //     };
    // };
    // docblock = template.summary.join(tabs);
    docblock = start;
    if(options.parameters) {
      // if(args) docblock += args;
    }
    // if(options.returns) docblock += template.returns.join(tabs);
    if(attributes) {
      docblock += attrs;
      if(short_attrs) {
        docblock += short_attrs.map(function(x) {
          if(options.style == 'numpy') {
              return tabs + x
          } else {
              return tabs + '    ' + x
          }
        }).join(tabs) + '\n';
      };
    };
    docblock += template.end.join(tabs);
    return docblock
  },

  scan_up(start, lines) {
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveUp(lines);
      editor.moveToBeginningOfLine();
      editor.selectToBufferPosition(start);
      var query = editor.getSelectedText();
      if(!(/"""/.test(query))) {

        var logic = this.stop_words.map(function(x) {
          return query.search(x)
        }).some(function(x) {return( x >= 0)});

        if(logic) {
          return null
        } else {
          tmp = this.scan_up(start, lines + 1);
          query = tmp[0];
          lines = tmp[1];
        };
      };
    };
    return [query, lines]
  },

  scan_down(start, lines) {
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      var query = editor.getSelectedText().trim();
      if(!(/"""/.test(query))) {

        var logic = this.stop_words.map(function(x) {
          return query.search(x)
        }).some(function(x) {return( x >= 0)});

        if(logic) {
          return null
        } else {
          tmp = this.scan_down(start, lines + 1);
          query = tmp[0];
          lines = tmp[1];
        };
      };
    };
    return [query, lines]
  },

  get_docblock() {
    let editor;

    if (editor = atom.workspace.getActiveTextEditor()) {
      var start_pos = editor.getCursorBufferPosition();
      editor.moveToEndOfLine();
      var pos_for_up = editor.getCursorBufferPosition();
      var text_up = this.scan_up(pos_for_up, 0);
      editor.setCursorBufferPosition(start_pos);
      editor.moveToBeginningOfLine();
      var pos_for_down = editor.getCursorBufferPosition();
      var text_down = this.scan_down(pos_for_down, 0);
      if((text_up !== null) & (text_down !== null)) {
        lines_up = text_up[0].split('\n');
        lines_down = text_down[0].split('\n').slice(1);
        return lines_up.join('\n') + lines_down.join('\n')
      }
    };
  },

  add_section_notes() {
    let editor;

    var idx = this.ordered_sections.indexOf('Notes');
    let sections_before = this.ordered_sections.slice(idx + 1);

    if (editor = atom.workspace.getActiveTextEditor()) {
      let language = editor.getGrammar().name;
      if(language === "Python" || language === "MagicPython") {
        var current_docblock = this.get_docblock().split('\n');
        for (var i = 1; i <= current_docblock.length; i++) {

        };
      };
    };
  }

};
