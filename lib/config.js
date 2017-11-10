'use babel';

export default packageConfig = {
  indent: {
    title: 'Initial indent',
    type: 'boolean',
    default: true,
    order: 0
  },
  parameters: {
    title: 'Describe parameters',
    type: 'boolean',
    default: true,
    order: 1
  },
  use_defaults: {
    title: 'Add default value to parameter description',
    type: 'boolean',
    default: false,
    order: 2
  },
  returns: {
    title: 'Describe returned value',
    type: 'boolean',
    default: true,
    order: 3
  },
  raises: {
    title: 'Describe raised exceptions',
    type: 'boolean',
    default: false,
    order: 4
  },
};
