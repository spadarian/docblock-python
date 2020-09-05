'use babel';
/* eslint-disable require-jsdoc, no-invalid-this*/

import {CompositeDisposable} from 'atom';
import packageConfig from './config.json';
import {
  generate_docblock,
} from './utils';
import {formatLint, lint_def, get_class_init, get_missing_attr,
  lint_docblocks, getStyledParam} from './linter-docblock-python.js';
import {loadProjectConfig,
  writeProjectConfig} from './projectconfig-docblock-python.js';

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

function activate(state) {
  // Events subscribed to in atom's system can be easily cleaned up with a
  // CompositeDisposable
  this.subscriptions = new CompositeDisposable();

  // Register command that toggles this view
  this.subscriptions.add(atom.commands.add('atom-workspace', {
    'docblock-python:generate_docblock': () => this.generate_docblock(),
    'docblock-python:writeProjectConfig': () => writeProjectConfig(),
  //   'docblock-python:add_section_notes': () => this.add_section_notes(),
  }));

  loadProjectConfig();
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
        resolve((that.lint_docblocks() || [])
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
    if ((text_up !== null) && (text_down !== null)) {
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
        start.column = start.column - this.options.tab_length;
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

// function add_section_notes() {
//   let editor;
//
//   // let idx = this.ordered_sections.indexOf('Notes');
//   // let sections_before = this.ordered_sections.slice(idx + 1);
//
//   if (editor = atom.workspace.getActiveTextEditor()) {
//     let language = editor.getGrammar().name;
//     if (language === 'Python' ||
//         language === 'MagicPython' ||
//         language === 'Cython') {
//       let current_docblock = this.get_docblock().split('\n');
//       for (let i = 1; i <= current_docblock.length; i++) {
//
//       };
//     };
//   };
// }

export default {
  ...main,
  get_def,
  get_all_docblocks,
  lint_docblocks,
  lint_def,
  get_class_init,
  get_missing_attr,
  provideLinter,
  formatLint,
  getStyledParam,
  scan_up,
  scan_down,
  get_docblock,
  generate_docblock,
  serialize, activate, deactivate,
};
