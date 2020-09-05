'use babel';
/* eslint-disable require-jsdoc*/

export function numpy({name, tabs, default_desc_text, use_defaults,
  default_value, use_types, separate_types, arg_type, type}) {
  return [
    `${tabs}${name} :`,
    (use_types) ? ` ${arg_type}` : '',
    '\n',
    `${tabs}    `,
    (default_desc_text) ? `Description of ${type} \`${name}\`` : '',
    (use_defaults && default_value) ? ` (the default is ${default_value})`:'',
    '.',
  ].join('');
}

export function google({name, tabs, default_desc_text, use_defaults,
  default_value, use_types, separate_types, arg_type, type}) {
  return [
    `${tabs}    ${name}`,
    (use_types) ? ` (${arg_type}): ` : ': ',
    (default_desc_text) ? `Description of parameter \`${name}\`` : '',
    (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
    '.',
  ].join('');
}

export function sphinx({name, tabs, default_desc_text, use_defaults,
  default_value, use_types, separate_types, arg_type, type}) {
  if (separate_types && use_types) {
    return [
      `${tabs}`,
      (type == 'parameter') ? ':param' : ':attr',
      ` ${name}: `,
      (default_desc_text) ? `Description of parameter \`${name}\`` : '',
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
      (default_desc_text) ? ` Description of parameter \`${name}\`` : ' ',
      (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
      '.',
    ].join('');
  };
}

export function epytext({name, tabs, default_desc_text, use_defaults,
  default_value, use_types, separate_types, arg_type, type}) {
  return [
    `${tabs}@param    ${name}: `,
    (default_desc_text) ? `Description of parameter \`${name}\`` : '',
    (use_defaults && default_value) ? `. Defaults to ${default_value}` : '',
    '.\n',
    `${tabs}@type:    ${arg_type}\n`,
  ].join('');
}

const styles = new Proxy(
  {numpy, google, epytext, sphinx},
  {
    get(target, style, receiver) {
      if (style in target) return Reflect.get(target, style, receiver);
      throw new ValueError(`no style ${style} found`);
    },
  }
);

export default styles;
