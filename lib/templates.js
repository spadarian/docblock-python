'use babel';

export default templates = {

  numpy: {
    summary: ['',
      '"""Short summary.\n',
    ],
    parameters: ['\n', 'Parameters\n', '----------\n'],
    attributes: ['\n', 'Attributes\n', '----------\n'],
    returns: ['\n',
      'Returns\n',
      '-------\n',
      'type\n',
      '    Description of returned object.\n'
    ],
    raises: ['\n',
      'Raises\n',
      '-------\n',
      'ExceptionName\n',
      '    Why the exception is raised.\n'
    ],
    end: ['\n', '"""\n']
  },

  google: {
    summary: ['',
      '"""Short summary.\n',
    ],
    parameters: ['\n', 'Args:\n'],
    attributes: ['\n', 'Attributes:\n'],
    returns: ['\n',
      'Returns:\n',
      '    type: Description of returned object.\n'
    ],
    raises: ['\n',
      'Raises:',
      '    ExceptionName: Why the exception is raised.\n'
    ],
    end: ['\n', '"""\n']
  }

};
