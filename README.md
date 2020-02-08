# Python DocBlock Package
[![Build Status](https://travis-ci.org/spadarian/docblock-python.svg?branch=master)](https://travis-ci.org/spadarian/docblock-python)
[![Plugin installs!](https://img.shields.io/apm/dm/docblock-python.svg?style=flat-square&colorB=blue)](https://atom.io/packages/docblock-python)
[![Package version!](https://img.shields.io/apm/v/docblock-python.svg?style=flat-square&colorB=blue)](https://atom.io/packages/docblock-python)

DocBlock is a package for [Atom](https://atom.io) which helps you to document your python code.

![Demo](https://raw.githubusercontent.com/spadarian/docblock-python/master/img/demo.gif)

### Lint support

This experimental feature should show you when the documentation is not up-to-date.
At the moment, it only checks if the current parameters and attributes are documented (not if you are documenting something that doesn't exist).

In order to this feature to work, you need to install [Linter](https://github.com/steelbrain/linter) and enable the option in `docblock-python` settings.

![Lint](https://raw.githubusercontent.com/spadarian/docblock-python/master/img/lint.png)

### Easily change between styles

Besides being able to select your preferred style from `docblock-python` settings, thanks to [@gonzalezzfelipe](https://github.com/gonzalezzfelipe), you can switch between styles pressing `Alt+Ctrl+S`. This does not change the style of current docblocks, but it is useful when moving between project with different documentation style.

<img src="https://user-images.githubusercontent.com/35146819/73701612-dccc4700-46c8-11ea-8d40-1166a7623a50.gif" width="650", alt="docblock-python-view">

## Installation

From the command line run `apm install docblock-python`. You can also install it from the [Atom Package manager](https://flight-manual.atom.io/using-atom/sections/atom-packages/#atom-packages).

## Available styles

* Numpy style: [A Guide to NumPy/SciPy Documentation](https://github.com/numpy/numpy/blob/master/doc/HOWTO_DOCUMENT.rst.txt).
* Google style: [Google Python Style Guide](http://google.github.io/styleguide/pyguide.html).
* Sphinx style: [Sphinx documentation](http://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html#info-field-lists).
* Epytext style: [Epytext documentation](http://epydoc.sourceforge.net/epytext.html).

## TODO

This is a non-exhaustive list of future additions. If you have any suggestions, drop me an email.

- [x] Add [Google style](http://google.github.io/styleguide/pyguide.html)
- [x] Add [Sphinx style](http://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html#info-field-lists)
- [ ] Scan for `Exceptions`
- [ ] Convert between styles
- [x] Add support for Type Hints ([PEP 484](https://www.python.org/dev/peps/pep-0484/))
- [x] Add lint support to show incomplete documentation
