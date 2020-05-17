'use babel';

export default main = {
  doc: `class AA:
    """Short summary.

    Parameters
    ----------
    attr2 : type
        Description of parameter \`attr2\`.

    Attributes
    ----------
    attr1 : type
        Description of attribute \`attr1\`.
    attr2

    """
    attr1 = 1

    def __init__(self, attr2):
        """Short summary.

        Parameters
        ----------
        attr2 : type
            Description of parameter \`attr2\`.

        Returns
        -------
        type
            Description of returned object.

        """
        self.attr2 = 2
        return True


class BB:
    """Short summary.

    Attributes
    ----------
    attr1 : type
        Description of attribute \`attr1\`.
    attr2 : type
        Description of attribute \`attr2\`.

    """
    attr1 = 1
    attr2 = 1

    def f1(self):
        """Short summary.

        Returns
        -------
        type
            Description of returned object.

        """
        return True


class CC:
    """Short summary."""
    pass


class DD:
    """Short summary."""

    def f1(self):
        """Short summary.

        Returns
        -------
        type
            Description of returned object.

        """
        return True


class EE:
    """Short summary.

    Attributes
    ----------
    attr1 : type
        Description of attribute \`attr1\`.

    """
    attr1 = 1


class FF:
    """Short summary.

    Attributes
    ----------
    attr1 : type
        Description of attribute \`attr1\`.

    """
    attr1 = 1`,
};
