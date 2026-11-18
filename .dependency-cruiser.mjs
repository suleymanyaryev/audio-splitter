/**
@type {import('dependency-cruiser').IConfiguration}
*/
export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This import closes a cycle; the modules on it are listed below. Break the cycle at its root: move what both sides need into a new module that imports neither of them, or pass the value in as a parameter. A cycle can run in dev and Vitest and still throw "Cannot access X before initialization" in the production bundle. Type-only imports are erased at compile time and never count.',
      from: {},
      to: {
        circular: true,
        dependencyTypesNot: ['type-only'],
        viaOnly: { dependencyTypesNot: ['type-only'] },
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.vue', '.js'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    cache: { folder: '.cache/dependency-cruiser', strategy: 'content' },
  },
}
