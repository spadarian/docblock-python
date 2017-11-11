'use babel';

describe('DocblockPython', () => {
  let workspaceElement, activationPromise, editor, buffer;

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
    });

  });

  describe('when we click in a line with a function definition', () => {
    it('inserts the docblock with default settings', () => {

      runs(() => {
        var pos;

        jasmine.attachToDOM(workspaceElement);
        editor = atom.workspace.getActiveTextEditor();
        expect(editor.getPath()).toContain('test.py');

        editor.moveToBottom()
        pos = editor.getCursorBufferPosition()
        expect(pos.row).toBe(2);

        editor.moveToTop();
        pos = editor.getCursorBufferPosition()

        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        var query = editor.getSelectedText();
        expect(query).toBe('def function(parameter1, parameter2):');

        atom.commands.dispatch(workspaceElement, 'docblock-python:generate_docblock');

        editor.moveToBottom()
        pos = editor.getCursorBufferPosition()
        expect(pos.row).toBe(17);

        editor.moveToTop();
        editor.moveToBeginningOfLine();
        editor.moveDown(1);
        pos = editor.getCursorBufferPosition();
        editor.moveDown(14);
        editor.moveToEndOfLine();
        editor.selectToBufferPosition(pos);
        var query = editor.getSelectedText();

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
        var returns = atom.config.get('docblock-python.returns');
        expect(returns).toBe(false);

        atom.commands.dispatch(workspaceElement, 'docblock-python:generate_docblock');

        editor.moveToBottom()
        pos = editor.getCursorBufferPosition()
        expect(pos.row).toBe(12);

      });


    })
  });
});
