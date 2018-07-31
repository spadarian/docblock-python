'use babel';

import {CompositeDisposable} from 'atom';
import packageConfig from './config.js';
import templates from './templates.js';

export default {

  config: packageConfig,

  subscriptions: null,

  options: {},
  accepted_starts: ['def', 'class'],
  stop_words: ['def'],
  ordered_sections: ['Parameters', 'Returns', 'Other Parameters', 'Raises',
    'See Also', 'Notes', 'References', 'Examples'],

  get_header(start, lines) {
    let editor;
    let query;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      query = editor.getSelectedText().trim();
      if (!(/:$/.test(query))) {
        // Handle one-line functions that return something
        if (query.includes('return') || query.endsWith('...')) {
          this.options.tabs = this.options.tabs.slice(4);
          return [query.replace(/\n/g, ''), lines];
        };
        if ((start.row + lines) <= (editor.getLineCount() - 2)) {
          tmp = this.get_header(start, lines + 1);
          if (!tmp) {
            return null;
          };
          query = tmp[0];
          lines = tmp[1];
        } else {
          return null;
        };
      };
    };
    return [query.replace(/\n/g, ''), lines];
  },

  fmap(arr, callback) {
    debugger;
    return arr.reduce((accum, ...args) => {
      let x = callback(...args);
      if (x !== undefined) {
        accum.push(x);
      }
      return accum;
    }, []);
  },

  format_lines(name, tabs, use_defaults, default_value, style, type) {
    let arg_type;
    let lines;
    if (name.indexOf(':') > -1) {
      let sep_idx = name.indexOf(':');
      arg_type = name.slice(sep_idx + 1).trim();
      name = name.slice(0, sep_idx).trim();
    } else {
      arg_type = 'type';
    };
    if (style == 'numpy') {
      lines = tabs +
      name +
      ' : ' + arg_type + '\n' +
      tabs +
      '    Description of ' +
      type +
      ' `' +
      name +
      '`';
      if (use_defaults && default_value) {
        lines += ' (the default is ' + default_value + ')';
      };
      lines += '.';
    };
    if (style == 'google') {
      lines = tabs +
      '    ' +
      name +
      ' (' + arg_type + '): Description of parameter `' +
      name +
      '`';
      if (use_defaults && default_value) {
        lines += '. Defaults to ' + default_value;
      };
      lines += '.';
    };

    return lines;
  },

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a
    // CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'docblock-python:generate_docblock': () => this.generate_docblock(),
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
    let docblock;
    // Load settings:
    let indent = atom.config.get('docblock-python.indent');
    let parameters = atom.config.get('docblock-python.parameters');
    let use_defaults = atom.config.get('docblock-python.use_defaults');
    let returns = atom.config.get('docblock-python.returns');
    let raises = atom.config.get('docblock-python.raises');
    let style = atom.config.get('docblock-python.style');
    let template = templates[style];

    let options = {
      indent: indent,
      parameters: parameters,
      use_defaults: use_defaults,
      returns: returns,
      raises: raises,
      style: style,
      template: template,
      tabs: '',
    };

    this.options = options;

    if (editor = atom.workspace.getActiveTextEditor()) {
      let language = editor.getGrammar().name;
      if (language === 'Python' || language === 'MagicPython') {
        let poss = editor.getCursorBufferPositions();
        let poss_ = [];
        let rows_ = [];
        for (p in poss) {
          if (!rows_.includes(poss[p].row)) {
            rows_.push(poss[p].row);
            poss_.push(poss[p]);
          }
        };
        poss = poss_.sort((a, b) => b.row - a.row);

        that = this;
        failed = 0;
        poss.map((pos) => {
          editor.setCursorBufferPosition(pos);
          editor.moveToFirstCharacterOfLine();
          pos = editor.getCursorBufferPosition();
          let col = pos.column;
          let tabs = '    '.repeat((col/4) + indent);
          options.tabs = tabs;
          editor.selectToEndOfLine();
          let query = editor.getSelectedText();
          let logic = that.accepted_starts.map(function(x) {
            return query.search(x);
          }).some(function(x) {
            return ( x >= 0);
          });
          if (logic) {
            let header = that.get_header(pos, 0);
            if (!header) {
              atom.notifications.addWarning('Something went wrong.' +
              'Readeched end of file.');
              return null;
            };
            query = header[0];
            let n_lines = header[1];

            if (query.search('def') == 0) {
              options.returns = atom.config.get('docblock-python.returns');
              let docblock_and_attrs = that.process_def(query, options);
              docblock = docblock_and_attrs[0];
            } else if (query.search('class') == 0) {
              docblock = that.process_class(query, options, pos);
            } else {
              failed += 1;
              editor.setCursorBufferPosition(pos);
              if (failed === poss.length) {
                atom.notifications.addWarning('Nothing to do.' +
                'Try selecting a line where you define a function or class.');
              };
            };

            editor.setCursorBufferPosition(pos);
            // Handle case when there is no empty line at the EOF
            // and we try to add docblock for a one-line function
            let addedNewLine = false;
            if ((pos.row + n_lines + 1) >= editor.getLineCount()) {
              editor.insertNewlineBelow();
              addedNewLine = true;
            };
            editor.moveDown(n_lines + 1);
            if (addedNewLine) {
              editor.deleteToBeginningOfLine();
            };
            editor.moveToBeginningOfLine();
            editor.insertText(docblock);
            editor.setCursorBufferPosition(pos);
          } else {
            failed += 1;
            editor.setCursorBufferPosition(pos);
            if (failed === poss.length) {
              atom.notifications.addWarning('Nothing to do.' +
              'Try selecting a line where you define a function or class.');
            };
          };
        });
      };
    }
  },

  scanArgs(args) {
    let pieces = args.split(',');
    let found = [];
    let opened = 0;
    let partial = '';
    for (let i = 0; i <= pieces.length - 1; i++) {
      opened += (pieces[i].match(/\(|\[|\{/g) || '').length;
      opened -= (pieces[i].match(/\)|\]|\}/g) || '').length;
      if (opened) {
        if (partial) {
          partial += ',' + pieces[i];
        } else {
          partial += pieces[i];
        };
      } else {
        if (partial) {
          partial += ',' + pieces[i];
        } else {
          partial += pieces[i];
        };
        found.push(partial);
        partial = '';
      };
    };
    return found;
  },

  process_def(query, options) {
    let args = /\(.*\)/.exec(query)[0];
    args = args.slice(1, args.length - 1);
    let args_list = this.scanArgs(args)
      .filter(function(x) {
        return x.indexOf('self') < 0 & x.length > 0;
      })
      .map(function(x) {
        return x.split('=')[0].trim();
      });
    let tabs = options.tabs;
    let template = JSON.parse(JSON.stringify(options.template));
    if (args) {
      let that = this;
      args = this.fmap(this.scanArgs(args), function(x) {
        let pieces = x.split('=');
        let name = pieces[0].trim();
        let default_value = null;
        if (pieces.length > 1) {
          default_value = pieces[1].trim();
        }

        if (name == 'self') {
          return undefined;
        };
        let lines = that.format_lines(name,
          tabs,
          options.use_defaults,
          default_value,
          options.style,
          'parameter');
        return lines;
      })
        .join('\n') + '\n';
      if (args.length > 1) {
        args = template.parameters.join(tabs) + args;
      } else {
        args = null;
      };
    };
    docblock = template.summary.join(tabs);
    if (options.parameters) {
      if (args) docblock += args;
    };
    if (query.indexOf('->') > -1) {
      let return_type = query.split('->')[1]
        .replace(':', '')
        .trim();
      template.returns = template.returns.map(function(v) {
        return v.replace('type', return_type);
      });
    }
    if (options.returns) docblock += template.returns.join(tabs);
    if (options.raises) docblock += template.raises.join(tabs);
    docblock += template.end.join(tabs);
    return [docblock, args_list];
  },

  find_init(start, lines=0) {
    let editor;
    let done;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      let query = editor.getSelectedText().trim();
      done = false;
      if (!(/def __init__/.test(query))) {
        let logic = this.stop_words.map(function(x) {
          return query.search(x);
        }).some(function(x) {
          return ( x >= 0);
        });

        if (logic) {
          return null;
        } else {
          tmp = this.find_init(start, lines + 1);
          lines = tmp;
        };
      } else {
        done = true;
      };
    };

    if (done) {
      let pos = editor.getCursorBufferPosition();
      pos.row = pos.row + lines;
      editor.setCursorBufferPosition(pos);
      editor.moveToFirstCharacterOfLine();
      pos = editor.getCursorBufferPosition();
      editor.setCursorBufferPosition(start);
      return pos;
    };

    return lines;
  },

  get_init(start, lines=1) {
    let editor;
    let n_tabs = start.column / 4;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBeginningOfLine();
      let last_line = editor.getSelectedText();
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      let query = editor.getSelectedText();
      let re = new RegExp(this.options.tabs, 'g');
      if (!last_line.match(re) & last_line.length) {
        return query;
      }

      let last_line_n_tabs;
      if (last_line.length) {
        last_line_n_tabs = last_line.match(re).length;
      } else {
        last_line_n_tabs = 9999; // This is to force the next if to be true
      }

      if (last_line_n_tabs > n_tabs & lines < editor.getLineCount()) {
        let logic = this.stop_words.map(function(x) {
          return query.search(x);
        }).some(function(x) {
          return ( x >= 0);
        });

        if (logic) {
          return query;
        } else {
          tmp = this.get_init(start, lines + 1);
          lines = tmp;
        };
      } else {
        return query;
      };
    };
    return lines;
  },

  process_list(args, options, that, label='parameter') {
    let tabs = options.tabs;
    ans = this.fmap(args, function(x) {
      let pieces = x.split('=');
      let name = pieces[0].trim();
      let default_value = null;
      if (pieces.length > 1) {
        default_value = pieces[1].trim();
      }

      if (name == 'self') {
        return undefined;
      };
      let lines = that.format_lines(name,
        tabs,
        options.use_defaults,
        default_value,
        options.style,
        label);
      return lines;
    })
      .join('\n') + '\n';
    return ans;
  },

  get_class_vars(start, init_pos) {
    let new_start = JSON.parse(JSON.stringify(start)); ;
    let end = JSON.parse(JSON.stringify(init_pos)); ;
    new_start['row'] += 1;
    end['row'] -= 1;
    if (new_start['row'] === end['row']) {
      return [];
    };
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(new_start);
      editor.selectToBufferPosition(init_pos);
      let query = editor.getSelectedText();
      let ans = query.split('\n')
        .filter(function(x) {
          return x.trim().length > 0 & x.indexOf('=') > -1;
        })
        .map(function(x) {
          return x.split('=')[0].trim();
        });
      return ans;
    };
  },

  process_class(query, options, pos) {
    let tabs = options.tabs;
    let template = options.template;
    let init_pos = this.find_init(pos);
    if (!init_pos) {
      return tabs + '"""Short summary."""\n';
    };
    let init_header = this.get_header(init_pos, 0);
    let n_lines = init_header[1];
    init_header = init_header[0];
    let class_options = options;
    class_options.returns = false;
    class_options.raises = false;
    let end_orig = class_options.template.end;
    class_options.template.end = [];
    let start_and_args = this.process_def(init_header, class_options);
    let start = start_and_args[0];
    let args_list = start_and_args[1];
    options.template.end = end_orig;

    init_pos.row = init_pos.row + 1 + n_lines;

    docblock = start;

    let attributes = this.get_init(init_pos);
    attributes = attributes.match(/self.\w+/g);
    if (!attributes) {
      attributes = [];
    };

    init_pos.row = init_pos.row - 1 - n_lines;

    let class_vars = this.get_class_vars(pos, init_pos);
    attributes = attributes.concat(class_vars);

    if (attributes.length) {
      attributes = attributes.map(function(x) {
        return x.replace('self.', '');
      });
      let long_attrs = attributes.filter(function(x) {
        return args_list.indexOf(x) < 0;
      });
      let short_attrs = attributes.filter(function(x) {
        return args_list.indexOf(x) > -1;
      });
      let attrs_text = template.attributes.join(tabs);
      if (long_attrs.length) {
        let that = this;
        attrs = this.process_list(long_attrs, options, that, 'attribute');
        if (attrs.length > 1) {
          attrs_text += attrs;
        };
      };

      docblock += attrs_text;
      if (short_attrs.length) {
        docblock += tabs;
        docblock += short_attrs.map(function(x) {
          if (options.style == 'numpy') {
            return x + '\n';
          } else {
            return '    ' + x + '\n';
          }
        }).join(tabs);
      };
    };
    docblock += template.end.join(tabs);
    return docblock;
  },

  scan_up(start, lines) {
    let editor;
    let query;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveUp(lines);
      editor.moveToBeginningOfLine();
      editor.selectToBufferPosition(start);
      query = editor.getSelectedText();
      if (!(/"""/.test(query))) {
        let logic = this.stop_words.map(function(x) {
          return query.search(x);
        }).some(function(x) {
          return ( x >= 0);
        });

        if (logic) {
          return null;
        } else {
          tmp = this.scan_up(start, lines + 1);
          query = tmp[0];
          lines = tmp[1];
        };
      };
    };
    return [query, lines];
  },

  scan_down(start, lines) {
    let editor;
    let query;
    if (editor = atom.workspace.getActiveTextEditor()) {
      editor.setCursorBufferPosition(start);
      editor.moveDown(lines);
      editor.moveToEndOfLine();
      editor.selectToBufferPosition(start);
      query = editor.getSelectedText().trim();
      if (!(/"""/.test(query))) {
        let logic = this.stop_words.map(function(x) {
          return query.search(x);
        }).some(function(x) {
          return ( x >= 0);
        });

        if (logic) {
          return null;
        } else {
          tmp = this.scan_down(start, lines + 1);
          query = tmp[0];
          lines = tmp[1];
        };
      };
    };
    return [query, lines];
  },

  get_docblock() {
    let editor;

    if (editor = atom.workspace.getActiveTextEditor()) {
      let start_pos = editor.getCursorBufferPosition();
      editor.moveToEndOfLine();
      let pos_for_up = editor.getCursorBufferPosition();
      let text_up = this.scan_up(pos_for_up, 0);
      editor.setCursorBufferPosition(start_pos);
      editor.moveToBeginningOfLine();
      let pos_for_down = editor.getCursorBufferPosition();
      let text_down = this.scan_down(pos_for_down, 0);
      if ((text_up !== null) & (text_down !== null)) {
        lines_up = text_up[0].split('\n');
        lines_down = text_down[0].split('\n').slice(1);
        return lines_up.join('\n') + lines_down.join('\n');
      }
    };
  },

  add_section_notes() {
    let editor;

    // let idx = this.ordered_sections.indexOf('Notes');
    // let sections_before = this.ordered_sections.slice(idx + 1);

    if (editor = atom.workspace.getActiveTextEditor()) {
      let language = editor.getGrammar().name;
      if (language === 'Python' || language === 'MagicPython') {
        let current_docblock = this.get_docblock().split('\n');
        for (let i = 1; i <= current_docblock.length; i++) {

        };
      };
    };
  },

};
