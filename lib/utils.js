'use babel';
/* everything in here should be immutable objects or pure functions */
/* eslint-disable require-jsdoc */
/* eslint-enable no-undef */
import main from './base.js';
import templates from './templates.js';
import styles from './styles.js';

export const copy = (obj) => JSON.parse(JSON.stringify(obj));

export const warn = (message) => atom.notifications.addWarning(message);
warn.eof = () => warn('Something went wrong. Reached end of file.');
warn.nothing_to_do = () => {
  warn(
    'Nothing to do. Try selecting a line where you define a function or class.'
  );
};

export function get_atom_config() {
  // Load settings:
  let [tab_length, tab_type] = ['editor.tabLength', 'editor.softTabs']
    .map((q) => atom.config.get(q, {scope: ['source.python']}));
  tab_type = tab_type ? ' '.repeat(tab_length) : '\t';
  const get = (query) => atom.config.get(`docblock-python.${query}`);
  const indent = get('indent');
  const parameters = get('parameters');
  const default_desc_text = get('default_desc_text');
  const use_defaults = get('use_defaults');
  const use_types = get('types.use_types');
  const separate_types = get('types.separate_types');
  const returns = get('returns');
  const raises = get('raises');
  const examples = get('examples');
  const style = get('style');
  const template = copy(templates[style]);

  let triple_quote_str;
  const quote_type = get('quote_type');
  if (quote_type === 'double') {
    triple_quote_str = '"""';
  } else {
    triple_quote_str = '\'\'\'';
  };

  const as_template = function(string) {
    if (string.match(/\${/)) {
      string = eval('`' + string.replace(/`/g, '\\`') + '`');
    };
    return string;
  };

  // Check for template strings
  for (const k in template) {
    if (template.hasOwnProperty(k)) {
      template[k] = template[k].map(as_template);
    }
  };

  let options = {
    indent: indent,
    tab_length: tab_length,
    tab_type: tab_type,
    triple_quote_str: triple_quote_str,
    parameters: parameters,
    default_desc_text: default_desc_text,
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
  return options;
}

export function generate_docblock() {
  let editor = atom.workspace.getActiveTextEditor();
  let docblock;

  let options = get_atom_config();

  if (editor) {
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

      failed = 0;
      poss.map((pos) => {
        editor.setCursorBufferPosition(pos);
        editor.moveToFirstCharacterOfLine();
        pos = editor.getCursorBufferPosition();
        let col = pos.column;
        let tabs = options.tab_type.repeat(
          (col / options.tab_length) + options.indent
        );
        options.tabs = tabs;
        editor.selectToEndOfLine();
        let query = editor.getSelectedText();
        let logic = main.accepted_starts
          .map((x) => query.search(x + ' '))
          .some((x) => x >= 0);
        if (logic) {
          let header = get_header(options, pos, 0);
          if (!header) {
            warn.eof();
            return null;
          };
          query = header[0];
          let n_lines = header[1];

          if (query.match(/def|async def/)) {
            options.returns = atom.config.get('docblock-python.returns');
            options.default_desc_text = atom.config
              .get('docblock-python.default_desc_text');
            let docblock_and_attrs = process_def(query, options);
            docblock = docblock_and_attrs[0];
          } else if (query.search('class') == 0) {
            docblock = process_class(query, options, pos);
          } else {
            failed += 1;
            editor.setCursorBufferPosition(pos);
            if (failed === poss.length) {
              warn.nothing_to_do();
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
            warn.nothing_to_do();
          };
        };
      });
    };
  }
}

function get_header(options, start, lines, accum='') {
  let editor = atom.workspace.getActiveTextEditor();
  let query;
  if (editor) {
    query = accum + '\n' + editor.lineTextForBufferRow(start.row + lines);
    query = query.trim();
    if (!(/:$/.test(query))) {
      // Handle one-line functions that return something
      if (query.includes('return') || query.endsWith('...')) {
        options.tabs = options.tabs.slice(options.tab_length);
        return [query, lines];
      };
      if ((start.row + lines) <= (editor.getLineCount() - 2)) {
        let tmp = get_header(options, start, lines + 1, query);
        if (!tmp) return null;
        query = tmp[0];
        lines = tmp[1];
      } else {
        return null;
      };
    };
  };
  return [query, lines];
};

function process_def(query, options) {
  let tabs = options.tabs;
  let template = copy(options.template);

  let params = extract_parameters(query);
  let lines = format_lines(params, options, 'parameter')
    .join('\n') + '\n';
  lines = template.parameters.join(tabs) + lines;

  docblock = template.summary.join(tabs);
  if (options.parameters && params.parameters.length > 0) {
    if (lines) docblock += lines;
  };
  let return_type = params.return_type;
  return_type = return_type === null ? 'type' : return_type;

  let returns = formatReturn(return_type, template.returns, options);

  if (options.returns) {
    let return_txt = options.default_desc_text ? returns.join(tabs) :
      returns.join(tabs).replace('Description of returned object', '');
    docblock += return_txt;
  };
  if (options.raises) docblock += template.raises.join(tabs);
  if (options.examples) docblock += template.examples.join(tabs);
  docblock += template.end.join(tabs);
  return [docblock, params.parameters];
}

function process_class(query, options, pos) {
  let {tabs, template} = options;
  let decorators = get_decorators(pos);
  let is_dataclass = decorators
    .map((x) => x.search('@dataclass'))
    .some((x) => x >= 0);
  if (is_dataclass) {
    let [params, attributes] = process_dataclass(pos);
    params = params[0].map((e, i) => {
      return [e, params[1][i], params[2][i]];
    });
    params_dict = {
      parameters: params[0],
      types: params[1],
      defaults: params[2],
    };
    let lines = format_lines(params_dict, options, 'parameter')
      .join('\n') + '\n';
    lines = template.parameters.join(tabs) + lines;
    docblock = template.summary.join(tabs);
    if (options.parameters && lines) {
      docblock += lines;
    };
    if (attributes.length) {
      let attrs_text = template.attributes.join(tabs);
      attrs = process_list(attributes, options, 'attribute');
      // let attrs = format_lines(args_, options, label)
      //   .join('\n') + '\n';
      if (attrs.length > 1) {
        attrs_text += attrs;
      };
      docblock += attrs_text;
    };
    docblock += template.end.join(tabs);
    return docblock;
  };
  let init_pos = find_next(options, 'def __init__', pos);
  let attributes = [];
  let args_list = [];
  if (init_pos) {
    let init_header = get_header(options, init_pos, 0);
    let n_lines = init_header[1];
    init_header = init_header[0];
    let class_options = options;
    class_options.returns = false;
    class_options.raises = false;
    let end_orig = class_options.template.end;
    class_options.template.end = [];
    let start_and_args = process_def(init_header, class_options);
    let start = start_and_args[0];
    args_list = start_and_args[1];
    options.template.end = end_orig;

    init_pos.row = init_pos.row + 1 + n_lines;

    docblock = start;

    let init_attributes = get_init(options, init_pos, 0);
    init_attributes = init_attributes.match(/self.\w+/g);
    attributes = init_attributes;

    init_pos.row = init_pos.row - 1 - n_lines;
  } else {
    docblock = tabs + options.triple_quote_str + 'Short summary.\n';
    init_pos = find_next(options, 'def|class|undefined', pos, 1);
  };
  let class_vars = get_class_vars(pos, init_pos);
  attributes = attributes.concat(class_vars);

  if (attributes.length) {
    attributes = attributes.map((x) => x.replace('self.', ''));
    attributes = Array(...new Set(attributes));
    let long_attrs = attributes.filter((x) => !args_list.includes(x));
    let short_attrs = attributes.filter((x) => args_list.includes(x));
    let attrs_text = template.attributes.join(tabs);
    if (long_attrs.length) {
      attrs = process_list(long_attrs, options, 'attribute');
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
          tabs + x + '\n')
        .join(tabs);
    };
    docblock += template.end.join(tabs);
  } else {
    docblock = tabs + options.triple_quote_str + 'Short summary.' +
      options.triple_quote_str + '\n';
  };
  return docblock;
}

export function extract_parameters(query) {
  let args = /\((.|\r|\n)*\)/.exec(query);
  if (args === null) {
    return {parameters: []};
  };
  args = args[0];
  args = args.slice(1, args.length - 1);
  let defaults = [];
  let args_list = scanArgs(args)
    .filter((x) => {
      return x.trim() !== 'self' &&
      x.trim() !== '*' &&
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

  let return_type = getFunctionReturnType(query);

  let ans = {
    parameters: params,
    types: types,
    defaults: defaults,
    label: query.replace(/\n/g, '').replace(/\s+/g, ' '),
    return_type: return_type,
  };
  return ans;
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
      let default_desc_text = options.default_desc_text;
      let use_defaults = options.use_defaults;
      let use_types = options.use_types;
      let separate_types = options.separate_types;

      return styles[options.style]({
        name, tabs, default_desc_text, use_defaults,
        default_value, use_types, separate_types, arg_type, type,
      });
    })
    .filter(Boolean);
  return lines;
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
        return x.indexOf(':rtype:') < 0;
      });
    } else if (options.style == 'epytext') {
      returns = returns.filter((x) => {
        return x.indexOf('@rtype:') < 0;
      });
    };
  };
  return returns;
}

function get_decorators(start, lines=-1, accum=[]) {
  if (start.row == 0) return [];
  if (start.row + lines < 0) return accum;
  let editor = atom.workspace.getActiveTextEditor();
  let ans;
  if (editor) {
    let line = editor.lineTextForBufferRow(start.row + lines);
    let logic = main.stop_words
      .map((x) => line.search(x))
      .some((x) => x >= 0);
    if (line.length > 0 && !logic ) {
      accum.push(line);
      ans = get_decorators(start, lines - 1, accum);
    } else {
      return accum;
    };
    return ans;
  }
}

function process_dataclass(start, lines=1, accum=[[], []]) {
  let editor = atom.workspace.getActiveTextEditor();
  let ans;
  if (editor) {
    let line = editor.lineTextForBufferRow(start.row + lines);
    let logic = ['def']
      .map((x) => line.search(x))
      .some((x) => x >= 0);
    if (logic) {
      return accum;
    } else if (line.match(':')) {
      let name = line.split(':')[0].trim();
      let type = line.match('=') ? line.split(':')[1].split('=')[0].trim() :
        line.split(':')[1].trim();
      let default_value = line.match('=') ? line.split('=')[1].trim() : null;
      accum[0].push([name, type, default_value]);
    } else {
      // Looking for attributes
      if (line.match('=')) {
        let attr = line.split('=')[0].trim();
        accum[1].push(attr);
      };
    };
    ans = process_dataclass(start, lines + 1, accum);
    return ans;
  }
}

function process_list(args, options, label='parameter') {
  let args_ = {
    parameters: args,
    types: args.map((x) => null),
    defaults: args.map((x) => null),
  };
  let lines = format_lines(args_, options, label)
    .join('\n') + '\n';
  return lines;
}

function find_next(options, pattern, start, lines=0, accum='') {
  let editor = atom.workspace.getActiveTextEditor();
  let done;
  let indent = 0;
  let query;
  if (editor) {
    indent = 0;
    let current_line = editor.lineTextForBufferRow(start.row + lines);
    query = accum + '\n' + current_line;
    if (current_line !== undefined) {
      done = false;
    } else {
      done = true;
    };
    let re = new RegExp(pattern);
    if (!(re.test(query))) {
      let logic = main.stop_words
        .map((x) => query.search(x))
        .some((x) => x >= 0);

      if (logic) {
        return null;
      } else {
        tmp = find_next(options, pattern, start, lines + 1, query);
        lines = tmp;
      };
    } else {
      ind_regex = new RegExp(options.tab_type, 'g');
      def_line = query.match('.*(' + pattern +').*')[0];
      indent = def_line.match(ind_regex);
      if (!indent) {
        indent = 0;
      } else {
        indent = indent.length;
      };
      done = true;
    };
  };

  if (done) {
    let pos = copy(start);
    pos.row = pos.row + lines;
    pos.column = pos.column + indent * options.tab_length;
    return pos;
  };

  return lines;
}

function get_init(options, start, lines=0, accum='') {
  let editor;
  let n_tabs = start.column / options.tab_length;
  if (editor = atom.workspace.getActiveTextEditor()) {
    let last_line = editor.lineTextForBufferRow(start.row + lines);
    let query = accum + '\n' + last_line;
    query = query.trim();
    let re = new RegExp(options.tab_type, 'g');
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
      let logic = main.stop_words
        .map((x)=> query.search(x))
        .some((x) => x >= 0);

      if (logic) {
        return query;
      } else {
        tmp = get_init(options, start, lines + 1, query);
        lines = tmp;
      };
    } else {
      return query;
    };
  };
  return lines;
}

function get_class_vars(start, init_pos) {
  let new_start = copy(start);
  let end = copy(init_pos);
  new_start['row'] += 1;
  end['row'] -= 1;
  if (new_start['row'] === end['row']) {
    return [];
  };
  let editor = atom.workspace.getActiveTextEditor();
  if (editor) {
    editor.setCursorBufferPosition(new_start);
    editor.selectToBufferPosition(init_pos);
    let query = editor.getSelectedText();
    let ans = query.split('\n')
      .filter((x) => x.trim().length > 0 && x.indexOf('=') > -1)
      .map((x) => x.split('=')[0].trim());
    return ans;
  };
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
    let logic = main.accepted_starts
      .map((x) => query.search(x + ' '))
      .some((x) => x >= 0);
    if (logic) {
      let header = get_header(start, 0);
      def = {def: header, pos: start};
    } else {
      if (direction === 'up') {
        def = get_def({row: start.row - 1, column: start.column}, 'up');
      } else if (direction === 'down') {
        def = get_def({row: start.row + 1, column: start.column}, 'down');
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

export function get_all_docblocks() {
  let options = get_atom_config();
  let editor = atom.workspace.getActiveTextEditor();
  if (editor) {
    let allText = editor.getText();
    let dbRegex = new RegExp('"""([^])*?"""', 'g');
    let match = dbRegex.exec(allText);
    let allBlocks = [];
    let last_end = -1;
    while (match) {
      let start = editor.buffer.positionForCharacterIndex(match.index);
      if (atom.config.get('docblock-python.indent')) {
        start.column = start.column - options.tab_length;
      };
      let def = get_def({row: start.row, column: start.column}, 'up');
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

export function get_class_init(options, block) {
  if (editor = atom.workspace.getActiveTextEditor()) {
    let init_pos = find_init(options, block.pos_end);
    let attributes = get_init(init_pos);
    attributes = attributes.match(/self.\w+/g);
    if (!attributes) {
      attributes = [];
    };
    attributes = attributes.map((x) => x.replace('self.', ''));
    let init_def = get_def(init_pos, 0);
    if (Object.keys(init_def).length === 0) {
      return {};
    };
    let data = {
      docblock: block.docblock,
      def: init_def.def[0],
      def_pos: init_def.pos,
    };
    return data;
  };
}

function find_init(options, start, lines=0, accum='') {
  let editor = atom.workspace.getActiveTextEditor();
  let done;
  let indent = 0;
  if (editor) {
    indent = 0;
    let query = (accum + '\n' + editor.lineTextForBufferRow(start.row +
      lines));
    done = false;
    if (!(/def __init__/.test(query))) {
      let logic = main.stop_words
        .map((x) => query.search(x))
        .some((x) => x >= 0);

      if (logic) {
        return null;
      } else {
        tmp = find_init(options, start, lines + 1, query);
        lines = tmp;
      };
    } else {
      ind_regex = new RegExp(options.tab_type, 'g');
      def_line = query.match('.*def __init__.*')[0];
      indent = def_line.match(ind_regex).length;
      done = true;
    };
  };

  if (done) {
    let pos = JSON.parse(JSON.stringify(start));
    pos.row = pos.row + lines;
    pos.column = pos.column + indent * options.tab_length;
    return pos;
  };

  return lines;
}

// function get_docblock() {
//   let editor = atom.workspace.getActiveTextEditor();
//   if (editor) {
//     let start_pos = editor.getCursorBufferPosition();
//     editor.moveToEndOfLine();
//     let pos_for_up = editor.getCursorBufferPosition();
//     let text_up = scan_up(pos_for_up, 0);
//     editor.setCursorBufferPosition(start_pos);
//     editor.moveToBeginningOfLine();
//     let pos_for_down = editor.getCursorBufferPosition();
//     let text_down = scan_down(pos_for_down, 0);
//     if ((text_up !== null) && (text_down !== null)) {
//       lines_up = text_up[0].split('\n');
//       lines_down = text_down[0].split('\n').slice(1);
//       return lines_up.join('\n') + lines_down.join('\n');
//     }
//   };
// }
//
// function scan_up(start, lines) {
//   let editor = atom.workspace.getActiveTextEditor();
//   let query;
//   if (editor) {
//     editor.setCursorBufferPosition(start);
//     editor.moveUp(lines);
//     editor.moveToBeginningOfLine();
//     editor.selectToBufferPosition(start);
//     let query = editor.getSelectedText();
//     if (!(/"""/.test(query))) {
//       let logic = main.stop_words
//         .map((x) => query.search(x))
//         .some((x) => x >= 0);
//       if (logic) {
//         return null;
//       } else {
//         tmp = scan_up(start, lines + 1);
//         query = tmp[0];
//         lines = tmp[1];
//       };
//     };
//   };
//   return [query, lines];
// }
//
// function scan_down(start, lines) {
//   let editor = atom.workspace.getActiveTextEditor();
//   let query;
//   if (editor) {
//     editor.setCursorBufferPosition(start);
//     editor.moveDown(lines);
//     editor.moveToEndOfLine();
//     editor.selectToBufferPosition(start);
//     let query = editor.getSelectedText().trim();
//     if (!(/"""/.test(query))) {
//       let logic = main.stop_words
//         .map((x) => query.search(x))
//         .some((x) => x >= 0);
//
//       if (logic) return null;
//       tmp = scan_down(start, lines + 1);
//       query = tmp[0];
//       lines = tmp[1];
//     };
//   };
//   return [query, lines];
// }
