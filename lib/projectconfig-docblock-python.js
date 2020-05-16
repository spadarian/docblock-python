'use babel';
/* eslint-disable require-jsdoc, no-invalid-this*/

import {File} from 'atom';


function getConfigPath() {
  let root_path = atom.project.getPaths()[0];
  let conf_path = root_path + '/.docblock.json';
  return conf_path;
}

function loadProjectConfig() {
  let conf_path = getConfigPath();
  f = new File(conf_path);
  f.exists().then((ans) => {
    if (ans) {
      f.read().then((content) => {
        let conf = JSON.parse(content);
        atom.config.set('docblock-python', conf);
      });
    };
  });
}

function writeProjectConfig() {
  let current_conf = atom.config.get('docblock-python');
  let conf_path = getConfigPath();
  f = new File(conf_path);
  f.write(JSON.stringify(current_conf, undefined, 4));
}

export default {
  loadProjectConfig,
  writeProjectConfig,
};
