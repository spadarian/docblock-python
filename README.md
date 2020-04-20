# Python DocBlock Package
[![Build Status](https://travis-ci.org/spadarian/docblock-python.svg?branch=master)](https://travis-ci.org/spadarian/docblock-python)
[![Plugin installs!](https://img.shields.io/apm/dm/docblock-python.svg?style=flat-square&colorB=blue)](https://atom.io/packages/docblock-python)
[![Package version!](https://img.shields.io/apm/v/docblock-python.svg?style=flat-square&colorB=blue)](https://atom.io/packages/docblock-python)

DocBlock is a package for [Atom](https://atom.io) which helps you to document your python code.

![Demo](https://raw.githubusercontent.com/spadarian/docblock-python/master/img/demo.gif)

## Installation

From the command line run `apm install docblock-python`. You can also install it from the [Atom Package manager](https://flight-manual.atom.io/using-atom/sections/atom-packages/#atom-packages).

## Available styles

* Numpy style: [A Guide to NumPy/SciPy Documentation](https://github.com/numpy/numpy/blob/master/doc/HOWTO_DOCUMENT.rst.txt).
* Google style: [Google Python Style Guide](http://google.github.io/styleguide/pyguide.html).
* Sphinx style: [Sphinx documentation](http://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html#info-field-lists).
* Epytext style: [Epytext documentation](http://epydoc.sourceforge.net/epytext.html).

## Project configuration file

It is possible to set configurations for different projects. You just need to add a `.docblock.json` file to the project root directory including any of the package settings. Below you can see an example JSON with all the settings set to their default value.

```
{
  "style": "numpy",
  "indent": true,
  "parameters": true,
  "quote_type": "double",
  "default_desc_text": true,
  "use_defaults": true,
  "returns": true,
  "raises": false,
  "examples": false,
  "types": {
    "use_types": true,
    "separate_types": false
  },
  "lint": false
}
```

A full list of the options and their possible values are described below:

Option | Value | Description
--- | --- | ---
__style__ | `"numpy"`, `"google"`, `"sphinx"` or `"epytext"` | Docblock style
__indent__ | `true` or `false` | Initial indent
__parameters__ | `true` or `false` | Describe parameters
__quote_type__ | `"double"` or `"single"` | Type of triple quotes to use
__default_desc_text__ | `true` or `false` | Show default description text ("Description of...")
__use_defaults__ | `true` or `false` | Add default value to parameter description
__returns__ | `true` or `false` | Describe returned value
__raises__ | `true` or `false` | Describe raised exceptions
__examples__ | `true` or `false` | Should illustrate how to use the function/class (doctest)
__types.use_types__ | `true` or `false` | Parameter and attribute type
__types.separate_types__ | `true` or `false` | Show types in a different line (sphinx style only)
__lint__ | `true` or `false` | Enable lint to show missing documentation (experimental)

## Lint support

This experimental feature should show you when the documentation is not up-to-date.
At the moment, it only checks if the current parameters and attributes are documented (not if you are documenting something that doesn't exist).

In order to this feature to work, you need to install [Linter](https://github.com/steelbrain/linter) and enable the option in `docblock-python` settings.

![Lint](https://raw.githubusercontent.com/spadarian/docblock-python/master/img/lint.png)

## TODO

This is a non-exhaustive list of future additions. If you have any suggestions, drop me an email.

- [x] Add [Google style](http://google.github.io/styleguide/pyguide.html)
- [x] Add [Sphinx style](http://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html#info-field-lists)
- [ ] Scan for `Exceptions`
- [ ] Convert between styles
- [x] Add support for Type Hints ([PEP 484](https://www.python.org/dev/peps/pep-0484/))
- [x] Add lint support to show incomplete documentation
- [x] Project configuration file
