'use babel';
/* everything in here should be immutable objects or pure functions */
/* eslint-disable require-jsdoc */
/* eslint-enable no-undef */

export const copy = (obj) => JSON.parse(JSON.stringify(obj));
