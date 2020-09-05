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

export default {
  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a
    // CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'docblock-python:generate_docblock': () => generate_docblock(),
      'docblock-python:writeProjectConfig': () => writeProjectConfig(),
    }));

    loadProjectConfig();
  },
  deactivate() {
    this.subscriptions.dispose();
  },
  serialize() {
    return {};
  },
  ...main,
  generate_docblock,
  get_all_docblocks,
  provideLinter,
};
