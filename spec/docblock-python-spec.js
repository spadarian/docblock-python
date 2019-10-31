'use babel';

import complex_doc from './fixtures/test2_documented.js';

let getAllText = function(editor) {
  editor.moveToTop();
  editor.moveToBeginningOfLine();
  pos = editor.getCursorBufferPosition();
  editor.moveToBottom();
  editor.moveToEndOfLine();
  editor.selectToBufferPosition(pos);
  return editor.getSelectedText();
};
let LinterJustSayNoProvider = [];
console.log(LinterJustSayNoProvider);

describe('DocblockPython', () => {
  let workspaceElement;
  let activationPromise;
  let editor;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('docblock-python');
    filePromise = atom.workspace.open('test.py');

    waitsForPromise(() => {
      return filePromise;
    });

    waitsForPromise(() => {
      return activationPromise;
    });

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-python')
        || atom.packages.activatePackage('MagicPython');
    });
  });

  describe('when we click in a line with a function definition', () => {
    it('inserts the docblock with default settings', () => {
      runs(() => {
        let pos;

        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        expect(editor.getPath()).toContain('test.py');

        editor.moveToBottom();
        pos = editor.getCursorBufferPosition();
        expect(pos.row).toBe(2);

        editor.moveToTop();
        pos = editor.getCursorBufferPosition();

        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        let query = editor.getSelectedText();
        expect(query).toBe('def function(parameter1, parameter2):');

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        editor.moveToBottom();
        pos = editor.getCursorBufferPosition();
        expect(pos.row).toBe(17);

        editor.moveToTop();
        editor.moveToBeginningOfLine();
        editor.moveDown(1);
        pos = editor.getCursorBufferPosition();
        editor.moveDown(14);
        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        query = editor.getSelectedText();

        expect(query.trim().slice(0, 3)).toBe('"""');
        expect(query.trim().slice(-3)).toBe('"""');
        expect(query).toContain('parameter1 : type');
        expect(query).toContain('parameter2 : type');
      });
    }),

    it('inserts the docblock without return description', () => {
      runs(() => {
        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        atom.config.set('docblock-python.returns', false);
        let returns = atom.config.get('docblock-python.returns');
        expect(returns).toBe(false);

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        editor.moveToBottom();
        pos = editor.getCursorBufferPosition();
        expect(pos.row).toBe(12);
      });
    }),

    it('inserts the docblock with numpy style', () => {
      runs(() => {
        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        atom.config.set('docblock-python.style', 'numpy');
        let style = atom.config.get('docblock-python.style');
        expect(style).toBe('numpy');

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        let query = getAllText(editor);

        expect(query).toContain('Parameters\n');
      });
    }),

    it('inserts the docblock with google style', () => {
      runs(() => {
        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        atom.config.set('docblock-python.style', 'google');
        let style = atom.config.get('docblock-python.style');
        expect(style).toBe('google');

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        let query = getAllText(editor);

        expect(query).toContain('Args:');
      });
    }),

    it('inserts the docblock with single triple quotes', () => {
      runs(() => {
        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        atom.config.set('docblock-python.quote_type', 'single');
        let quote_type = atom.config.get('docblock-python.quote_type');
        expect(quote_type).toBe('single');

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        let query = getAllText(editor);

        expect(query).toContain('\'\'\'');
      });
    }),

    it('inserts the docblock with double triple quotes', () => {
      runs(() => {
        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        let quote_type = atom.config.get('docblock-python.quote_type');
        expect(quote_type).toBe('double');

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        let query = getAllText(editor);

        expect(query).toContain('"""');
      });
    });
  });
});

describe('DocblockPython2', () => {
  let workspaceElement;
  let activationPromise;
  let editor;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('docblock-python');
    filePromise = atom.workspace.open('test2.py');

    waitsForPromise(() => {
      return filePromise;
    });

    waitsForPromise(() => {
      return activationPromise;
    });

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-python') ||
      atom.packages.activatePackage('MagicPython');
    });
  });

  describe('when we click in a line with a function definition', () => {
    it('inserts the docblock in complex class', () => {
      runs(() => {
        editor = atom.workspace.getActiveTextEditor();

        let style = atom.config.get('docblock-python.style');
        expect(style).toBe('numpy');

        atom.config.set('docblock-python.use_defaults', true);
        expect(atom.config.get('docblock-python.use_defaults')).toBe(true);

        let g_python = atom.grammars.grammarForId('source.python');
        expect(g_python.name).toBe('Python');

        expect(editor.getPath()).toContain('test2.py');

        for (let i = 1; i <= 14; i++) {
          editor.addCursorAtBufferPosition({row: i, column: 0});
        };
        expect(editor.getCursorBufferPositions().length).toBe(15);
        workspaceElement = atom.views.getView(atom.workspace);

        editor.setGrammar(g_python);
        expect(editor.getGrammar().name).toBe('Python');

        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');
        editor.setCursorBufferPosition({row: 0, column: 0});

        let query = getAllText(editor);
        expect(query.trim()).toBe(complex_doc.doc.trim());
      });
    });
  });
});

xdescribe('DocblockPythonLint', () => {
  // let workspaceElement;
  let editor;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    filePromise = atom.workspace.open('test.py');
    activationPromise = atom.packages.activatePackage('linter');
    activationPromise2 = atom.packages.activatePackage('docblock-python');

    waitsForPromise(() => {
      return filePromise;
    });

    waitsForPromise(() => {
      return activationPromise;
    });

    waitsForPromise(() => {
      return activationPromise2;
    });

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-python') ||
      atom.packages.activatePackage('MagicPython');
    });
  });

  it('adds a lint warning', () => {
    editor = atom.workspace.getActiveTextEditor();
    expect(atom.config.get('docblock-python.lint')).toBe(false);
    atom.config.set('docblock-python.lint', true);
    expect(atom.config.get('docblock-python.lint')).toBe(true);

    atom.commands.dispatch(workspaceElement,
      'docblock-python:generate_docblock');

    let start_pos = {row: 5, column: 0};
    editor.setCursorBufferPosition({row: 6, column: 0});
    editor.moveToEndOfLine();
    editor.selectToBufferPosition(start_pos);
    editor.delete();

    let all_packs = atom.packages.getLoadedPackages()
      .map((x) => {
        return x.name;
      });
    expect(all_packs.indexOf('linter')).toBeGreaterThan(-1);

    let pack = atom.packages.getLoadedPackages()
      .filter((x) => {
        return x.name === 'docblock-python';
      })[0];
    expect(pack.name).toBe('docblock-python');

    expect(editor.getText()).not.toContain('parameter1 :');

    LinterProvider = pack.mainModule.provideLinter();
    LinterProvider.lint(editor).then((messages) => {
      expect(messages.length).toBe(1);
      expect(messages[0].excerpt).toContain('parameter1');
    });
  });
});

describe('DocblockPythonDataClass', () => {
  let workspaceElement;
  let activationPromise;
  let editor;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('docblock-python');
    filePromise = atom.workspace.open('test_dataclass.py');

    waitsForPromise(() => {
      return filePromise;
    });

    waitsForPromise(() => {
      return activationPromise;
    });

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-python')
        || atom.packages.activatePackage('MagicPython');
    });
  });

  describe('when the Class is defined as a dataclass', () => {
    it('inserts the docblock with default settings', () => {
      runs(() => {
        let pos;

        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        expect(editor.getPath()).toContain('test_dataclass.py');

        editor.moveToBottom();
        pos = editor.getCursorBufferPosition();
        expect(pos.row).toBe(10);

        editor.moveToTop();
        editor.moveDown(1);
        atom.commands.dispatch(workspaceElement,
          'docblock-python:generate_docblock');

        editor.moveDown(1);
        editor.moveToBeginningOfLine();
        pos = editor.getCursorBufferPosition();
        editor.moveDown(16);
        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        query = editor.getSelectedText();

        expect(query.trim().slice(0, 3)).toBe('"""');
        expect(query.trim().slice(-3)).toBe('"""');
        expect(query).toContain('a : str');
        expect(query).toContain('b : float');
        expect(query).toContain('c : int');
        expect(query).toContain('z : type');
        expect(query).toContain('Parameters');
        expect(query).toContain('Attributes');
      });
    });
  });
});
