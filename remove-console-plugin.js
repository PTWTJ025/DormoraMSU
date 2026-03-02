const esbuild = require('esbuild');

// Custom plugin to remove console.log statements
const removeConsoleLogPlugin = {
  name: 'remove-console-log',
  setup(build) {
    build.onLoad({ filter: /\.(js|ts)$/ }, async (args) => {
      const contents = await require('fs').promises.readFile(args.path, 'utf8');
      const modifiedContents = contents
        .replace(/console\.log\([^)]*\);?/g, '')
        .replace(/console\.error\([^)]*\);?/g, '')
        .replace(/console\.warn\([^)]*\);?/g, '')
        .replace(/console\.info\([^)]*\);?/g, '');
      
      return {
        contents: modifiedContents,
        loader: args.path.endsWith('.ts') ? 'ts' : 'js'
      };
    });
  }
};

module.exports = {
  default: removeConsoleLogPlugin
};
