'use babel';

export default complex_doc = {
  doc: `class Test:
    """Short summary.

    Parameters
    ----------
    a : type
        Description of parameter \`a\`.

    Attributes
    ----------
    b : type
        Description of attribute \`b\`.
    zzz : type
        Description of attribute \`zzz\`.
    a

    """

    zzz = 'TEST'

    def __init__(self, a):
        """Short summary.

        Parameters
        ----------
        a : type
            Description of parameter \`a\`.

        Returns
        -------
        type
            Description of returned object.

        """
        self.a = a
        self.b = a + 1

    def f(self, c: int = 1) -> int:
        """Short summary.

        Parameters
        ----------
        c : int
            Description of parameter \`c\` (the default is 1).

        Returns
        -------
        int
            Description of returned object.

        """
        first = c * self.b

        def pow(n, p):
            """Short summary.

            Parameters
            ----------
            n : type
                Description of parameter \`n\`.
            p : type
                Description of parameter \`p\`.

            Returns
            -------
            type
                Description of returned object.

            """
            return n ** p

        return pow(first, 2)`,
};
