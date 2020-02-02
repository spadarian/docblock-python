'use babel';
/* eslint-disable require-jsdoc, no-invalid-this*/

const SelectListView = require('atom-select-list')

import templates from './templates.js';


export default class StyleChooserView {

  constructor(serializedState) {
    // Create root element
    this.selectListView = new SelectListView({
      items: [],
      elementForItem: (item) => {
        element = document.createElement('li')

        primaryLine = document.createElement('div')
        if (atom.config.get('docblock-python.style') == item ) {
          primaryLine.classList.add('docblock-python-current')
        } else {
          primaryLine.classList.add('docblock-python')
        }
        primaryLine.appendChild(document.createTextNode(item))
        element.appendChild(primaryLine)
        return element
      },
      didConfirmSelection: (item) => {
        atom.config.set('docblock-python.style', item)
        this.cancel()
      },
    })
    this.selectListView.element.classList.add('docblock-python')
  }

  get element () {
    return this.selectListView.element
  }

  getItems() {
    var keys = Object.keys(templates);
    return keys
  }

  destroy () {
    if (this.panel) {
      this.panel.destroy()
    }
    return this.selectListView.destroy()
  }

  cancel () {
    this.selectListView.reset()
    this.hide()
  }

  show () {
    this.previouslyFocusedElement = document.activeElement
    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({item: this})
    }
    this.selectListView.update({items: this.getItems()})
    this.panel.show()
    this.selectListView.focus()
  }

  hide () {
    if (this.panel) {
      this.panel.hide()
    }

    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }
}
