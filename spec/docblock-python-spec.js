'use babel';

describe('DocblockPython', () => {
  let workspaceElement; let activationPromise; let editor;

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

        atom.commands.dispatch(
          workspaceElement, 'docblock-python:generate_docblock'
        );

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

        atom.commands.dispatch(
          workspaceElement, 'docblock-python:generate_docblock'
        );

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

        atom.commands.dispatch(
          workspaceElement, 'docblock-python:generate_docblock'
        );

        editor.moveToTop();
        editor.moveToBeginningOfLine();
        pos = editor.getCursorBufferPosition();
        editor.moveToBottom();
        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        let query = editor.getSelectedText();

        expect(query).toContain('Parameters\n');
      });
    });

    it('inserts the docblock with google style', () => {
      runs(() => {
        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        atom.config.set('docblock-python.style', 'google');
        let style = atom.config.get('docblock-python.style');
        expect(style).toBe('google');

        atom.commands.dispatch(
          workspaceElement, 'docblock-python:generate_docblock'
        );

        editor.moveToTop();
        editor.moveToBeginningOfLine();
        pos = editor.getCursorBufferPosition();
        editor.moveToBottom();
        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        let query = editor.getSelectedText();

        expect(query).toContain('Args:');
      });
    });
  });
});
