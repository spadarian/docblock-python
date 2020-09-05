'use babel';
/* everything in here should be immutable objects or pure functions */
/* eslint-disable require-jsdoc */
/* eslint-enable no-undef */

export const copy = (obj) => JSON.parse(JSON.stringify(obj));

export const warn = (message) => atom.notifications.addWarning(message);
warn.eof = () => warn('Something went wrong. Reached end of file.');
warn.nothing_to_do = () => {
  warn(
    'Nothing to do. Try selecting a line where you define a function or class.'
  );
};
