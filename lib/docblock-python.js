'use babel';
/* eslint-disable require-jsdoc, no-invalid-this*/

import {CompositeDisposable} from 'atom';
import packageConfig from './config.json';
import {
  generate_docblock,
  get_all_docblocks,
} from './utils';
import {
  provideLinter,
} from './linter-docblock-python.js';
import {
  loadProjectConfig,
  writeProjectConfig,
} from './projectconfig-docblock-python.js';

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

function deactivate() {
  this.subscriptions.dispose();
}

function serialize() {
  return {};
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
  get_all_docblocks,
  provideLinter,
  generate_docblock,
  serialize, activate, deactivate,
};
