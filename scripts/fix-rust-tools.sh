#!/bin/bash

# Fix find_references.ts
sed -i 's/context.rustEngine.findReferences(p.symbol, p.path || '\''\.'\'')/context.rustEngine.findReferences(p.symbol, (p.path || '\''.'\'').startsWith('\''\/'\'') ? p.path : `${context.cwd}\/${p.path || '\''.'\''}`.replace(\/\\\/\\.$/g, '\'''\''))/' src/tools/find_references.ts

# Fix build_dependency_graph.ts
sed -i 's/context.rustEngine.buildDependencyGraph(p.path || '\''\.'\'')/context.rustEngine.buildDependencyGraph((p.path || '\''.'\'').startsWith('\''\/'\'') ? p.path : `${context.cwd}\/${p.path || '\''.'\''}`.replace(\/\\\/\\.$/g, '\'''\''))/' src/tools/build_dependency_graph.ts

echo "Done!"
