'use babel';
/* eslint-disable require-jsdoc, no-invalid-this*/

import {get_all_docblocks} from './docblock-python.js';

get_all_docblocks = get_all_docblocks;

function formatLint(msg_pos, par_name, par_type, editorPath) {
  let type_text;
  if (par_type === 'attr') {
    type_text = 'attribute';
  } else {
    type_text = 'parameter';
  };
  return {
    severity: 'warning',
    location: {
      file: editorPath,
      position: msg_pos,
    },
    excerpt: `Missing documentation for ${type_text} ${par_name}`,
    icon: 'book',
  };
}

function getStyledParam(par) {
  let style = atom.config.get('docblock-python.style');
  let to_match;
  switch (style) {
  case 'numpy':
    to_match = `${par} :`;
    break;
  case 'google':
    to_match = `    ${par}`;
    break;
  case 'sphinx':
    to_match = `${par}:`;
    break;
  case 'epytext':
    to_match = `@param    ${par}:`;
    break;
  };
  return to_match;
}

function lint_def(block) {
  let params = that.extract_parameters(block.def);
  let missing = [];
  let to_match;
  params.parameters.map((par) => {
    to_match = getStyledParam(par)
      .replace('*', '\\*');
    match = block.docblock.match(to_match);
    if (match) {

    } else {
      regex_pattern = `${par}(?=(,|:|=|\\)))`;
      regex_pattern = regex_pattern.replace('*', '\\*');
      par_regex = new RegExp(regex_pattern);
      pos_in_def = block.def.match(par_regex).index;
      par_pos = JSON.parse(JSON.stringify(block.def_pos));
      let par_row_offset = 0;
      let par_indent = block.def_pos.column;
      let par_col = block.def.match(par_regex).index + par_indent;
      if (block.def_lines > 0) {
        let def_chunks = block.def.split('\n');
        let in_line = def_chunks.map((x) => x.match(par_regex) !== null)
          .indexOf(true);
        par_row_offset = in_line;
        par_col = def_chunks[in_line].match(par_regex).index;
      };
      par_pos.row = par_pos.row + par_row_offset;
      par_pos.column = par_col;
      par_pos_end = JSON.parse(JSON.stringify(par_pos));
      par_pos_end.column = par_pos_end.column + par.length;
      let data = {pos: [par_pos, par_pos_end], par: par, type: 'par'};
      missing.push(data);
    }
  });
  return missing;
}

function get_class_init(block) {
  if (editor = atom.workspace.getActiveTextEditor()) {
    let init_pos = that.find_init2(block.pos_end);
    let attributes = that.get_init(init_pos);
    attributes = attributes.match(/self.\w+/g);
    if (!attributes) {
      attributes = [];
    };
    attributes = attributes.map((x) => x.replace('self.', ''));
    let init_def = that.get_def(init_pos, 0);
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

function get_missing_attr(block) {
  if (editor = atom.workspace.getActiveTextEditor()) {
    let init_pos = that.find_init2(block.pos_end);
    init_pos.row = init_pos.row + 1;
    let attributes = that.get_init(init_pos);
    attributes = attributes.match(/self.\w+/g);
    if (!attributes) {
      attributes = [];
    };
    attributes = attributes.map((x) => x.replace('self.', ''));

    let missing = [];
    let to_match;
    attributes.map((par) => {
      to_match = getStyledParam(par);
      match = block.docblock.match(to_match);
      if (match) {

      } else {
        attr_regex = new RegExp(`self.${par}`);

        let init_pos = that.find_init2(block.pos_end);
        init_pos.row = init_pos.row + 1;
        let finding_line = true;
        let i = 0;
        while (finding_line) {
          line_text = editor.lineTextForBufferRow(init_pos.row + i);
          last_match = line_text.match(attr_regex);
          if (last_match) {
            finding_line = false;
          } else {
            i = i + 1;
          };
        };
        par_pos = {
          row: init_pos.row + i,
          column: last_match.index + 5,
        };
        par_pos_end = {
          row: init_pos.row + i,
          column: last_match.index + 5 + par.length,
        };
        let data = {pos: [par_pos, par_pos_end], par: par, type: 'attr'};
        missing.push(data);
      }
    });
    return missing;
  };
}

function lint_docblocks() {
  let lint_enabled = atom.config.get('docblock-python.lint');
  if (!lint_enabled) {
    return [];
  };
  if (editor = atom.workspace.getActiveTextEditor()) {
    let allBlocks = get_all_docblocks();
    let missing_par = [];
    if (allBlocks.length > 0) {
      let that = this;
      allBlocks.map((x) => {
        if (x.def.match('class')) {
          let class_init = that.get_class_init(x);
          if (Object.keys(class_init).length === 0) {
            return;
          };
          let data = that.lint_def(class_init);
          missing_par.push(data);
          data = that.get_missing_attr(x);
          missing_par.push(data);
        } else {
          let data = that.lint_def(x);
          missing_par.push(data);
        }
      });
    };
    return [].concat(...missing_par);
  };
}

export default {
  formatLint,
  lint_def,
  get_class_init,
  get_missing_attr,
  lint_docblocks,
  getStyledParam,
};
