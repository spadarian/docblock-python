'use babel';
/* eslint-disable require-jsdoc*/

import packageConfig from './config.json';

export default {
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
