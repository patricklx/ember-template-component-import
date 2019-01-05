'use strict';

/* eslint-env node */

const path = require('path');
const BroccoliFilter = require('broccoli-persistent-filter');
const md5Hex = require('md5-hex');

const IMPORT_PATTERN = /\{\{\s*import (\w+) from ['"]([^'"]+)['"]\s*\}\}/gi;

class TemplateImportProcessor extends BroccoliFilter {

  constructor(inputNode, options = {}) {
    if (!options.hasOwnProperty('persist')) {
      options.persist = true;
    }

    super(inputNode, {
      annotation: options.annotation,
      persist: options.persist
    });

    this.options = options;
    this._console = this.options.console || console;

    this.extensions = [ 'hbs', 'handlebars' ];
    this.targetExtension = 'hbs';
  }

  baseDir() {
    return __dirname;
  }

  cacheKeyProcessString(string, relativePath) {
    return md5Hex([
      string,
      relativePath
    ]);
  }

  processString(contents, relativePath) {
    let imports = [];
    let rewrittenContents = contents.replace(IMPORT_PATTERN, (_, localName, importPath) => {
      if (importPath.startsWith('.')) {
        importPath = path.resolve(relativePath, '..', importPath);
        importPath = path.relative(this.options.root, importPath);
      }
      imports.push({ localName, importPath });
      return '';
    });

    let header = imports.map(({ importPath, localName }) => {
      return `{{#let (component '${ importPath }') as |${ localName }|}}`;
    }).join('');
    let footer = imports.map(() => `{{/let}}`).join('');

    let result = header + rewrittenContents + footer;
    return result;
  }

}

module.exports = {
  name: require('./package').name,

  setupPreprocessorRegistry(type, registry) {
    registry.add('template', {
      name: 'ember-template-component-import',
      ext: 'hbs',
      toTree: (tree) => {
        let componentsRoot = path.join(this.project.root, this.project.config('development').podModulePrefix);
        tree = new TemplateImportProcessor(tree, { root: componentsRoot });
        return tree;
      }
    });

    if (type === 'parent') {
      this.parentRegistry = registry;
    }
  },
};