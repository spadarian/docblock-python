'use babel';
/* eslint-disable require-jsdoc, no-invalid-this*/

import {CompositeDisposable} from 'atom';
import packageConfig from './config.json';
import templates from './templates.js';
import {formatLint, lint_def, get_class_init, get_missing_attr,
  lint_docblocks, getStyledParam} from './linter-docblock-python.js';

const main = {
  config: packageConfig,
  options: {},
  subscriptions: null,
  accepted_starts: ['def', 'class', 'async def'],
  stop_words: ['def', 'cdef'],
  ordered_sections: [
    'Parameters', 'Returns', 'Other Parameters', 'Raises',
    'See Also', 'Notes', 'References', 'Examples',
  ],
};

function get_header(start, lines, accum='') {
  let editor;
  let query;
  if (editor = atom.workspace.getActiveTextEditor()) {
    query = accum + '\n' + editor.lineTextForBufferRow(start.row + lines);
    query = query.trim();
    // editor.setCursorBufferPosition(start);
    // editor.moveDown(lines);
    // editor.moveToEndOfLine();
    // editor.selectToBufferPosition(start);
    // query = editor.getSelectedText().trim();
    if (!(/:$/.test(query))) {
      // Handle one-line functions that return something
      if (query.includes('return') || query.endsWith('...')) {
        this.options.tabs = this.options.tabs.slice(4);
        return [query, lines];
      };
      if ((start.row + lines) <= (editor.getLineCount() - 2)) {
        let tmp = get_header(start, lines + 1, query);
        if (!tmp) return null;
        query = tmp[0];
        lines = tmp[1];
      } else {
        return null;
      };
    };
  };
  return [query, lines];
}

function numpy({name, tabs, use_defaults, default_value, use_types, arg_type,
  type}) {
  return [
    `${tabs}${name} :`,
    (use_types) ? ` ${arg_type}` : '',
    '\n',
    `${tabs}    Description of ${type} \`${name}\``,
    (use_defaults && default_value) ? ` (the default is ${default_value})`:'',
    '.',
  ].join('');
}

function google({name, tabs, use_defaults, default_value, use_types, arg_type,
  type}) {
  return [
    `${tabs}    ${name}`,
    (use_types) ? ` (${arg_type})` : '',
    `: Description of parameter \`${name}\``,
    (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
    '.',
  ].join('');
}

function sphinx({name, tabs, use_defaults, default_value, use_types,
  separate_types, arg_type, type}) {
  if (separate_types & use_types) {
    return [
      `${tabs}`,
      (type == 'parameter') ? ':param' : ':attr',
      ` ${name}: Description of parameter \`${name}\``,
      (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
      '.\n',
      `${tabs}:type ${name}: ${arg_type}`,
    ].join('');
  } else {
    return [
      `${tabs}`,
      (type == 'parameter') ? ':param' : ':attr',
      (use_types) ? ` ${arg_type} ` : ' ',
      `${name}:`,
      ` Description of parameter \`${name}\``,
      (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
      '.',
    ].join('');
  };
}

function epytext({name, tabs, use_defaults, default_value, use_types, arg_type,
  type}) {
  return [
    `${tabs}@param    ${name}: `,
    `Description of parameter \`${name}\``,
    (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
    '.\n',
    `${tabs}@type:    ${arg_type}\n`,
  ].join('');
}


function format_lines(params, options, type) {
  let lines = null;
  lines = params.parameters
    .map((v, i) => {
      if (v === 'self') return undefined;
      let name = v;
      let default_value = params.defaults[i];
      let arg_type = params.types[i];
      if (arg_type === null) {
        arg_type = 'type';
      };
      let tabs = options.tabs;
      let use_defaults = options.use_defaults;
      let use_types = options.use_types;
      let separate_types = options.separate_types;
      if (options.style == 'numpy') {
        return numpy({name, tabs, use_defaults, default_value,
          use_types, arg_type, type});
      }

      if (options.style == 'google') {
        return google({name, tabs, use_defaults, default_value,
          use_types, arg_type, type});
      };

      if (options.style == 'sphinx') {
        return sphinx({name, tabs, use_defaults, default_value,
          use_types, separate_types, arg_type, type});
      };

      if (options.style == 'epytext') {
        return epytext({name, tabs, use_defaults, default_value,
          use_types, arg_type, type});
      };
    })
    .filter(Boolean);
  return lines;
}

function activate(state) {
  // Events subscribed to in atom's system can be easily cleaned up with a
  // CompositeDisposable
  this.subscriptions = new CompositeDisposable();

  // Register command that toggles this view
  this.subscriptions.add(atom.commands.add('atom-workspace', {
    'docblock-python:generate_docblock': () => this.generate_docblock(),
  //   'docblock-python:add_section_notes': () => this.add_section_notes(),
  }));
}

function provideLinter() {
  that = this;
  return {
    name: 'docblock-python',
    scope: 'file', // or 'project'
    lintsOnChange: true, // or true
    grammarScopes: ['source.python'],
    lint(textEditor) {
      const editorPath = textEditor.getPath();
      return new Promise(function(resolve) {
        resolve(that.lint_docblocks()
          .map((missing) => {
            return that.formatLint(missing.pos,
              missing.par, missing.type, editorPath);
          })
        );
      });
    },
  };
}

function deactivate() {
  this.subscriptions.dispose();
}

function serialize() {
  return {};
}

function extract_parameters(query) {
  let args = /\((.|\r|\n)*\)/.exec(query);
  if (args === null) {
    return {parameters: []};
  };
  args = args[0];
  args = args.slice(1, args.length - 1);
  let defaults = [];
  let args_list = scanArgs(args)
    .filter((x) => {
      return x.trim() !== 'self' &
      x.trim() !== '*' &
      x.trim().length > 0;
    })
    .map((x) => {
      let resp = x.split('=')[0].trim();
      let default_ = x.split('=')[1];
      default_ = default_ ? default_.trim() : null;
      defaults.push(default_);
      return resp;
    });
  let params = [];
  let types = [];
  args_list.map((x) => {
    let parts;
    if (x.indexOf(':') > 0) { // Normal typing
      parts = x.split(':');
      params.push(parts[0].trim());
      types.push(parts[1].trim());
    } else if (x.indexOf(' ') > 0) { // Cython typing
      parts = x.split(' ');
      params.push(parts[1].trim());
      types.push(parts[0].trim());
    } else { // No typing
      params.push(x.trim());
      types.push(null);
    }
  });

  let return_type = this.getFunctionReturnType(query);

  let ans = {
    parameters: params,
    types: types,
    defaults: defaults,
    label: query.replace(/\n/g, '').replace(/\s+/g, ' '),
    return_type: return_type,
  };
  return ans;
}

function generate_docblock() {
  let editor;
  let docblock;
  // Load settings:
  let indent = atom.config.get('docblock-python.indent');
  let parameters = atom.config.get('docblock-python.parameters');
  let use_defaults = atom.config.get('docblock-python.use_defaults');
  let use_types = atom.config.get('docblock-python.types.use_types');
  let separate_types = atom.config.get('docblock-python.types.separate_types');
  let returns = atom.config.get('docblock-python.returns');
  let raises = atom.config.get('docblock-python.raises');
  let examples = atom.config.get('docblock-python.examples');
  let style = atom.config.get('docblock-python.style');
  let template = templates[style];

  let options = {
    indent: indent,
    parameters: parameters,
    use_defaults: use_defaults,
    use_types: use_types,
    separate_types: separate_types,
    returns: returns,
    raises: raises,
    style: style,
    examples: examples,
    template: template,
    tabs: '',
  };

  this.options = options;

  if (editor = atom.workspace.getActiveTextEditor()) {
    let language = editor.getGrammar().name;
    if (language === 'Python' ||
        language === 'MagicPython' ||
        language === 'Cython') {
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
        let logic = that.accepted_starts
          .map((x) => query.search(x + ' '))
          .some((x) => x >= 0);
        if (logic) {
          let header = that.get_header(pos, 0);
          if (!header) {
            atom.notifications.addWarning('Something went wrong.' +
            'Reached end of file.');
            return null;
          };
          query = header[0];
          let n_lines = header[1];

          if (query.match(/def|async def/)) {
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
          if (docblock) {
            editor.insertText(docblock);
          };
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
}

function getFunctionReturnType(query) {
  let i;
  let return_type = null;
  let match = query.match('^.+(?=\\()');
  match = match[0];
  let rev_match = match.split('').reverse().join('');
  i = match.indexOf(' ');
  let def_type = match.slice(0, i);
  i = rev_match.indexOf(' ');
  let name = rev_match.slice(0, i).split('').reverse().join('');
  let cython_return_type = match.replace(def_type, '').replace(name, '').trim();

  if (query.indexOf('->') > -1 && cython_return_type.length === 0) {
    return_type = query.split('->')[1]
      .replace(':', '')
      .trim();
  };

  if (cython_return_type.length > 0) {
    return_type = cython_return_type;
  };

  return return_type;
}

function scanArgs(args) {
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
  return found.filter((x) => x.length > 0);
}

function formatReturn(return_type, returns, options) {
  if (options.use_types) {
    if (options.style == 'sphinx' || options.style == 'epytext') {
      returns = returns
        .map((v) => v.replace(' type', ' ' + return_type));
    } else {
      returns = returns
        .map((v) => v.replace('type', return_type));
    }
  } else {
    if (options.style == 'google') {
      returns = returns
        .map((v) => v.replace('type', return_type));
    } else if (options.style == 'numpy') {
      returns = returns.filter((x) => x.indexOf('type'));
    } else if (options.style == 'sphinx') {
      returns = returns.filter((x) => {
        return x.indexOf(':return:') > -1;
      });
    } else if (options.style == 'epytext') {
      returns = returns.filter((x) => {
        return x.indexOf('@return:') > -1;
      });
    };
  };
  return returns;
}

// requires this
function process_def(query, options) {
  let that = this;
  let tabs = options.tabs;
  let template = JSON.parse(JSON.stringify(options.template));

  let params = this.extract_parameters(query);
  let lines = that.format_lines(params, options, 'parameter')
    .join('\n') + '\n';
  lines = template.parameters.join(tabs) + lines;

  docblock = template.summary.join(tabs);
  if (options.parameters) {
    if (lines) docblock += lines;
  };
  let return_type = params.return_type;
  return_type = return_type === null ? 'type' : return_type;

  let returns = this.formatReturn(return_type, template.returns, options);

  if (options.returns) docblock += returns.join(tabs);
  if (options.raises) docblock += template.raises.join(tabs);
  if (options.examples) docblock += template.examples.join(tabs);
  docblock += template.end.join(tabs);
  return [docblock, params.parameters];
}

function find_init(start, lines=0, accum='') {
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
      let logic = this.stop_words
        .map((x) => query.search(x))
        .some((x) => x >= 0);

      if (logic) {
        return null;
      } else {
        tmp = this.find_init(start, lines + 1, query);
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
}

function find_init2(start, lines=0, accum='') {
  let editor;
  let done;
  let indent = 0;
  if (editor = atom.workspace.getActiveTextEditor()) {
    indent = 0;
    let query = (accum + '\n' + editor.lineTextForBufferRow(start.row +
      lines));
    done = false;
    if (!(/def __init__/.test(query))) {
      let logic = this.stop_words
        .map((x) => query.search(x))
        .some((x) => x >= 0);

      if (logic) {
        return null;
      } else {
        tmp = this.find_init2(start, lines + 1, query);
        lines = tmp;
      };
    } else {
      ind_regex = new RegExp('    ', 'g');
      def_line = query.match('.*def __init__.*')[0];
      indent = def_line.match(ind_regex).length;
      done = true;
    };
  };

  if (done) {
    let pos = JSON.parse(JSON.stringify(start));
    pos.row = pos.row + lines;
    pos.column = pos.column + indent * 4;
    return pos;
  };

  return lines;
}

function get_init(start, lines=0, accum='') {
  let editor;
  let n_tabs = start.column / 4;
  if (editor = atom.workspace.getActiveTextEditor()) {
    let last_line = editor.lineTextForBufferRow(start.row + lines);
    let query = accum + '\n' + last_line;
    query = query.trim();
    // editor.setCursorBufferPosition(start);
    // editor.moveDown(lines);
    // editor.moveToEndOfLine();
    // editor.selectToBeginningOfLine();
    // let last_line = editor.getSelectedText();
    // editor.moveToEndOfLine();
    // editor.selectToBufferPosition(start);
    // let query = editor.getSelectedText();
    // let re = new RegExp(this.options.tabs, 'g');
    let re = new RegExp('    ', 'g');
    if (!last_line.match(re) && last_line.length) {
      return query;
    }

    let last_line_n_tabs;
    if (last_line.length) {
      last_line_n_tabs = last_line.match(re).length;
    } else {
      last_line_n_tabs = 9999; // This is to force the next if to be true
    }

    if (last_line_n_tabs > n_tabs &&
        start.row + lines + 1 < editor.getLineCount()) {
      let logic = this.stop_words
        .map((x)=> query.search(x))
        .some((x) => x >= 0);

      if (logic) {
        return query;
      } else {
        tmp = this.get_init(start, lines + 1, query);
        lines = tmp;
      };
    } else {
      return query;
    };
  };
  return lines;
}

// requires this
function process_list(args, options, that, label='parameter') {
  let args_ = {
    parameters: args,
    types: args.map((x) => null),
    defaults: args.map((x) => null),
  };
  let lines = that.format_lines(args_, options, label)
    .join('\n') + '\n';
  return lines;
}

function get_class_vars(start, init_pos) {
  let new_start = JSON.parse(JSON.stringify(start));
  let end = JSON.parse(JSON.stringify(init_pos));
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
      .filter((x) => x.trim().length > 0 & x.indexOf('=') > -1)
      .map((x) => x.split('=')[0].trim());
    return ans;
  };
}

// requires this
function process_class(query, options, pos) {
  let {tabs, template} = options;
  let init_pos = this.find_init2(pos);
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

  let attributes = this.get_init(init_pos, 0);
  attributes = attributes.match(/self.\w+/g);
  if (!attributes) {
    attributes = [];
  };

  init_pos.row = init_pos.row - 1 - n_lines;

  let class_vars = get_class_vars(pos, init_pos);
  attributes = attributes.concat(class_vars);

  if (attributes.length) {
    attributes = attributes.map((x) => x.replace('self.', ''));
    attributes = Array(...new Set(attributes));
    let long_attrs = attributes.filter((x) => !args_list.includes(x));
    let short_attrs = attributes.filter((x) => args_list.includes(x));
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
      docblock += short_attrs
        .map((x) => ['numpy', 'sphinx', 'epytext'].indexOf(options.style) > -1 ?
          ((options.style == 'sphinx' || options.style == 'epytext')
            ? `:attr ${x}:\n` : x + '\n'):
          '    ' + x + '\n')
        .join(tabs);
    };
  };
  docblock += template.end.join(tabs);
  return docblock;
}

// requires this
function scan_up(start, lines) {
  let editor;
  let query;
  if (editor = atom.workspace.getActiveTextEditor()) {
    editor.setCursorBufferPosition(start);
    editor.moveUp(lines);
    editor.moveToBeginningOfLine();
    editor.selectToBufferPosition(start);
    let query = editor.getSelectedText();
    if (!(/"""/.test(query))) {
      let logic = this.stop_words
        .map((x) => query.search(x))
        .some((x) => x >= 0);
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
}

function scan_down(start, lines) {
  let editor;
  let query;
  if (editor = atom.workspace.getActiveTextEditor()) {
    editor.setCursorBufferPosition(start);
    editor.moveDown(lines);
    editor.moveToEndOfLine();
    editor.selectToBufferPosition(start);
    let query = editor.getSelectedText().trim();
    if (!(/"""/.test(query))) {
      let logic = this.stop_words
        .map((x) => query.search(x))
        .some((x) => x >= 0);

      if (logic) return null;
      tmp = this.scan_down(start, lines + 1);
      query = tmp[0];
      lines = tmp[1];
    };
  };
  return [query, lines];
}

function get_docblock() {
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
}

function get_def(start, direction) {
  let query;
  let def;
  if (editor = atom.workspace.getActiveTextEditor()) {
    if (start.row < 0) {
      return {};
    }
    query = editor.lineTextForBufferRow(start.row);
    let should_stop = ['return', 'yield']
      .map((x) => query.search(x))
      .some((x) => x >= 0);
    if (should_stop) {
      return {};
    }
    let logic = this.accepted_starts
      .map((x) => query.search(x + ' '))
      .some((x) => x >= 0);
    if (logic) {
      let header = this.get_header(start, 0);
      def = {def: header, pos: start};
    } else {
      if (direction === 'up') {
        def = this.get_def({row: start.row - 1, column: start.column}, 'up');
      } else if (direction === 'down') {
        def = this.get_def({row: start.row + 1, column: start.column}, 'down');
      }
    };
    if (def === undefined) {
      return {};
    };
    if (Object.keys(def).length) {
      return {def: def.def, pos: def.pos};
    } else {
      return {};
    };
  };
}

function get_all_docblocks() {
  let editor;
  if (editor = atom.workspace.getActiveTextEditor()) {
    let allText = editor.getText();
    let dbRegex = new RegExp('"""([^])*?"""', 'g');
    let match = dbRegex.exec(allText);
    let allBlocks = [];
    let last_end = -1;
    while (match) {
      let start = editor.buffer.positionForCharacterIndex(match.index);
      if (atom.config.get('docblock-python.indent')) {
        start.column = start.column - 4;
      };
      let def = this.get_def({row: start.row, column: start.column}, 'up');
      if (Object.keys(def).length && last_end < def.pos.row) {
        let block = {
          docblock: match[0],
          pos_start_char: match.index,
          pos_start: start,
          pos_end_char: dbRegex.lastIndex,
          pos_end: editor.buffer.positionForCharacterIndex(dbRegex.lastIndex
            + 1),
          def: def.def[0],
          def_lines: def.def[1],
          def_pos: def.pos,
        };
        last_end = block.pos_end.row;
        allBlocks.push(block);
      };
      match = dbRegex.exec(allText);
    }
    return allBlocks;
  };
}

function add_section_notes() {
  let editor;

  // let idx = this.ordered_sections.indexOf('Notes');
  // let sections_before = this.ordered_sections.slice(idx + 1);

  if (editor = atom.workspace.getActiveTextEditor()) {
    let language = editor.getGrammar().name;
    if (language === 'Python' ||
        language === 'MagicPython' ||
        language === 'Cython') {
      let current_docblock = this.get_docblock().split('\n');
      for (let i = 1; i <= current_docblock.length; i++) {

      };
    };
  };
}

export default {
  ...main,
  format_lines,
  formatReturn,
  find_init,
  find_init2,
  get_init,
  get_def,
  get_all_docblocks,
  lint_docblocks,
  lint_def,
  get_class_init,
  get_missing_attr,
  provideLinter,
  formatLint,
  getStyledParam,
  process_list,
  extract_parameters,
  process_def,
  get_class_vars,
  process_class,
  get_header,
  scan_up,
  scan_down,
  get_docblock,
  add_section_notes,
  generate_docblock,
  getFunctionReturnType,
  serialize, activate, deactivate,
};
