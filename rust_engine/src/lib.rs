#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use std::fs;
use walkdir::WalkDir;
use tree_sitter::{Parser, Node};
use fuzzy_matcher::FuzzyMatcher;
use fuzzy_matcher::skim::SkimMatcherV2;

#[napi(object)]
pub struct SearchResult {
  pub file: String,
  pub line: u32,
  pub match_content: String,
  pub score: i64,
}

#[napi(object)]
pub struct SymbolInfo {
  pub name: String,
  pub kind: String,
  pub signature: String,
  pub line: u32,
  pub file: String,
}

#[napi(object)]
pub struct ImportInfo {
  pub source: String,
  pub symbols: Vec<String>,
  pub is_default: bool,
  pub is_namespace: bool,
}

#[napi(object)]
pub struct ExportInfo {
  pub name: String,
  pub kind: String,
  pub is_default: bool,
}

#[napi(object)]
pub struct ImportsExports {
  pub imports: Vec<ImportInfo>,
  pub exports: Vec<ExportInfo>,
}

#[napi(object)]
pub struct DependencyNode {
  pub file: String,
  pub exports: Vec<String>,
}

#[napi(object)]
pub struct DependencyEdge {
  pub from: String,
  pub to: String,
  pub symbols: Vec<String>,
  pub external: bool,
}

#[napi(object)]
pub struct DependencyGraph {
  pub nodes: Vec<DependencyNode>,
  pub edges: Vec<DependencyEdge>,
}

#[napi(object)]
pub struct SymbolLocation {
  pub file: String,
  pub line: u32,
  pub column: u32,
  pub kind: String,
  pub external: bool,
  pub package: Option<String>,
}

#[napi(object)]
pub struct Reference {
  pub file: String,
  pub line: u32,
  pub column: u32,
  pub context: String,
  pub is_definition: bool,
}

#[napi] pub fn search(path: String, query: String) -> Vec<SearchResult> {
    let matcher = SkimMatcherV2::default();
    let mut results = Vec::new();

    for entry in WalkDir::new(path)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
             let path_str = entry.path().to_string_lossy();
             let lang_type = if path_str.ends_with(".ts") || path_str.ends_with(".tsx") {
                "typescript"
            } else if path_str.ends_with(".rs") {
                "rust"
            } else {
                continue;
            };

            if let Ok(content) = fs::read_to_string(entry.path()) {
                 find_matches(&content, lang_type, &path_str, &query, &matcher, &mut results);
            }
        }
    }

    // Sort by score descending
    results.sort_by(|a, b| b.score.cmp(&a.score));
    results.truncate(10); // Return top 10
    results
}


#[napi] pub fn generate_repo_map(path: String) -> String {
  let mut repo_map = String::new();
  
  for entry in WalkDir::new(path)
    .into_iter()
    .filter_entry(|e| !is_hidden(e))
    .filter_map(|e| e.ok())
  {
    if entry.file_type().is_file() {
      let path_str = entry.path().to_string_lossy();
      
      let lang_type = if path_str.ends_with(".ts") || path_str.ends_with(".tsx") {
          "typescript"
      } else if path_str.ends_with(".rs") {
          "rust"
      } else {
          continue; 
      };

      if let Ok(content) = fs::read_to_string(entry.path()) {
        repo_map.push_str(&format!("\n---\nFile: {}\n", path_str));
        let skeleton = extract_skeleton(&content, lang_type);
        repo_map.push_str(&skeleton);
      }
    }
  }

  repo_map
}

#[napi]
pub fn get_symbol_info(file: String, symbol: String) -> Option<SymbolInfo> {
    let content = match fs::read_to_string(&file) {
        Ok(c) => c,
        Err(_) => return None,
    };

    let lang_type = if file.ends_with(".ts") || file.ends_with(".tsx") {
        "typescript"
    } else if file.ends_with(".rs") {
        "rust"
    } else {
        return None;
    };

    let mut parser = Parser::new();
    let language = match lang_type {
        "typescript" => tree_sitter_typescript::language_typescript(),
        "rust" => tree_sitter_rust::language(),
        _ => return None,
    };

    if parser.set_language(language).is_err() {
        return None;
    }

    let tree = parser.parse(&content, None)?;
    let root_node = tree.root_node();

    find_symbol(&root_node, &content, &symbol, &file)
}

#[napi]
pub fn get_imports_exports(file: String) -> Option<ImportsExports> {
    let content = match fs::read_to_string(&file) {
        Ok(c) => c,
        Err(_) => return None,
    };

    // Only support TypeScript for now
    if !file.ends_with(".ts") && !file.ends_with(".tsx") {
        return None;
    }

    let mut parser = Parser::new();
    let language = tree_sitter_typescript::language_typescript();

    if parser.set_language(language).is_err() {
        return None;
    }

    let tree = parser.parse(&content, None)?;
    let root_node = tree.root_node();

    let mut imports = Vec::new();
    let mut exports = Vec::new();

    extract_imports_exports(&root_node, &content, &mut imports, &mut exports);

    Some(ImportsExports { imports, exports })
}

fn extract_imports_exports(
    node: &Node,
    source: &str,
    imports: &mut Vec<ImportInfo>,
    exports: &mut Vec<ExportInfo>,
) {
    let kind = node.kind();

    match kind {
        "import_statement" => {
            if let Some(import_info) = parse_import_statement(node, source) {
                imports.push(import_info);
            }
        }
        "export_statement" => {
            parse_export_statement(node, source, exports);
        }
        _ => {}
    }

    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        extract_imports_exports(&child, source, imports, exports);
    }
}

fn parse_import_statement(node: &Node, source: &str) -> Option<ImportInfo> {
    let mut source_path = String::new();
    let mut symbols = Vec::new();
    let mut is_default = false;
    let mut is_namespace = false;

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "string" | "string_fragment" => {
                let start = child.start_byte();
                let end = child.end_byte();
                let text = &source[start..end];
                // Remove quotes
                source_path = text.trim_matches(|c| c == '"' || c == '\'').to_string();
            }
            "import_clause" => {
                let mut clause_cursor = child.walk();
                for clause_child in child.children(&mut clause_cursor) {
                    match clause_child.kind() {
                        "identifier" => {
                            // Default import
                            let start = clause_child.start_byte();
                            let end = clause_child.end_byte();
                            symbols.push(source[start..end].to_string());
                            is_default = true;
                        }
                        "namespace_import" => {
                            // import * as foo
                            is_namespace = true;
                            let mut ns_cursor = clause_child.walk();
                            for ns_child in clause_child.children(&mut ns_cursor) {
                                if ns_child.kind() == "identifier" {
                                    let start = ns_child.start_byte();
                                    let end = ns_child.end_byte();
                                    symbols.push(source[start..end].to_string());
                                }
                            }
                        }
                        "named_imports" => {
                            // import { foo, bar }
                            let mut named_cursor = clause_child.walk();
                            for named_child in clause_child.children(&mut named_cursor) {
                                if named_child.kind() == "import_specifier" {
                                    let mut spec_cursor = named_child.walk();
                                    for spec_child in named_child.children(&mut spec_cursor) {
                                        if spec_child.kind() == "identifier" {
                                            let start = spec_child.start_byte();
                                            let end = spec_child.end_byte();
                                            symbols.push(source[start..end].to_string());
                                            break; // Only get the first identifier (the imported name)
                                        }
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }

    if source_path.is_empty() {
        return None;
    }

    Some(ImportInfo {
        source: source_path,
        symbols,
        is_default,
        is_namespace,
    })
}

fn parse_export_statement(node: &Node, source: &str, exports: &mut Vec<ExportInfo>) {
    let mut cursor = node.walk();
    let mut is_default = false;

    for child in node.children(&mut cursor) {
        match child.kind() {
            "default" => {
                is_default = true;
            }
            "function_declaration" | "class_declaration" => {
                // Extract name from the declaration
                let mut decl_cursor = child.walk();
                for decl_child in child.children(&mut decl_cursor) {
                    if decl_child.kind() == "identifier" || decl_child.kind() == "type_identifier" {
                        let start = decl_child.start_byte();
                        let end = decl_child.end_byte();
                        exports.push(ExportInfo {
                            name: source[start..end].to_string(),
                            kind: if child.kind() == "function_declaration" {
                                "function".to_string()
                            } else {
                                "class".to_string()
                            },
                            is_default,
                        });
                        break;
                    }
                }
            }
            "lexical_declaration" => {
                // export const foo = ...
                let mut decl_cursor = child.walk();
                for decl_child in child.children(&mut decl_cursor) {
                    if decl_child.kind() == "variable_declarator" {
                        let mut var_cursor = decl_child.walk();
                        for var_child in decl_child.children(&mut var_cursor) {
                            if var_child.kind() == "identifier" {
                                let start = var_child.start_byte();
                                let end = var_child.end_byte();
                                exports.push(ExportInfo {
                                    name: source[start..end].to_string(),
                                    kind: "variable".to_string(),
                                    is_default,
                                });
                                break;
                            }
                        }
                    }
                }
            }
            "interface_declaration" => {
                let mut decl_cursor = child.walk();
                for decl_child in child.children(&mut decl_cursor) {
                    if decl_child.kind() == "type_identifier" {
                        let start = decl_child.start_byte();
                        let end = decl_child.end_byte();
                        exports.push(ExportInfo {
                            name: source[start..end].to_string(),
                            kind: "interface".to_string(),
                            is_default,
                        });
                        break;
                    }
                }
            }
            _ => {}
        }
    }
}

fn find_symbol(node: &Node, source: &str, target_symbol: &str, file_path: &str) -> Option<SymbolInfo> {
    let kind = node.kind();

    // Check if this node is a relevant declaration
    let (is_relevant, symbol_kind) = match kind {
        "function_declaration" => (true, "function"),
        "class_declaration" => (true, "class"),
        "interface_declaration" => (true, "interface"),
        "method_definition" => (true, "method"),
        "function_item" => (true, "function"),
        "struct_item" => (true, "struct"),
        "trait_item" => (true, "trait"),
        "impl_item" => (true, "impl"),
        "lexical_declaration" | "variable_declaration" => (true, "variable"),
        _ => (false, ""),
    };

    if is_relevant {
        // Try to extract the name from the node
        let name = extract_symbol_name(node, source, kind);

        if let Some(ref n) = name {
            if n == target_symbol {
                let start_byte = node.start_byte();
                let end_byte = node.end_byte();
                let node_text = &source[start_byte..end_byte];
                let signature = node_text.split('{').next().unwrap_or(node_text).trim().to_string();

                return Some(SymbolInfo {
                    name: n.clone(),
                    kind: symbol_kind.to_string(),
                    signature,
                    line: node.start_position().row as u32 + 1,
                    file: file_path.to_string(),
                });
            }
        }
    }

    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if let Some(result) = find_symbol(&child, source, target_symbol, file_path) {
            return Some(result);
        }
    }

    None
}

fn extract_symbol_name(node: &Node, source: &str, kind: &str) -> Option<String> {
    let mut cursor = node.walk();

    for child in node.children(&mut cursor) {
        let child_kind = child.kind();

        // Look for identifier nodes that contain the name
        match child_kind {
            "identifier" | "type_identifier" | "property_identifier" => {
                let start = child.start_byte();
                let end = child.end_byte();
                return Some(source[start..end].to_string());
            }
            "variable_declarator" => {
                // For variable declarations, get the name from the declarator
                let mut inner_cursor = child.walk();
                for inner_child in child.children(&mut inner_cursor) {
                    if inner_child.kind() == "identifier" {
                        let start = inner_child.start_byte();
                        let end = inner_child.end_byte();
                        return Some(source[start..end].to_string());
                    }
                }
            }
            _ => {}
        }
    }

    None
}

fn is_hidden(entry: &walkdir::DirEntry) -> bool {
  entry
    .file_name()
    .to_str()
    .map(|s| (s.starts_with('.') && s != ".") || s == "node_modules" || s == "target" || s == "dist")
    .unwrap_or(false)
}

fn extract_skeleton(source_code: &str, lang_type: &str) -> String {
    let mut parser = Parser::new();
    let language = match lang_type {
        "typescript" => tree_sitter_typescript::language_typescript(),
        "rust" => tree_sitter_rust::language(),
        _ => return String::new(),
    };
    
    if parser.set_language(language).is_err() {
        return String::new();
    }

    let tree = match parser.parse(source_code, None) {
        Some(t) => t,
        None => return String::new(),
    };

    let root_node = tree.root_node();
    let mut skeleton = String::new();
    walk_tree(&root_node, source_code, &mut skeleton, 0);
    skeleton
}

fn walk_tree(node: &Node, source: &str, output: &mut String, depth: usize) {
    let kind = node.kind();

    let is_relevant = match kind {
        "function_declaration" | "class_declaration" | "interface_declaration" | "method_definition" |
        "function_item" | "struct_item" | "trait_item" | "impl_item" | "field_declaration" => true,
        _ => false,
    };

    if is_relevant {
        let start_byte = node.start_byte();
        let end_byte = node.end_byte();
        let node_text = &source[start_byte..end_byte];
        let signature = node_text.split('{').next().unwrap_or(node_text).trim();
        let indent = "  ".repeat(depth);
        output.push_str(&format!("{}{}\n", indent, signature));
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        let should_recurse = match kind {
            "program" | "source_file" | "class_declaration" | "impl_item" | "class_body" |
            "declaration_list" | "export_statement" | "mod_item" | "struct_item" | "field_declaration_list" => true,
            _ => false
        };

        if should_recurse || depth == 0 {
             walk_tree(&child, source, output, if is_relevant { depth + 1 } else { depth });
        }
    }
}

fn find_matches(source: &str, lang_type: &str, file_path: &str, query: &str, matcher: &SkimMatcherV2, results: &mut Vec<SearchResult>) {
     let mut parser = Parser::new();
    let language = match lang_type {
        "typescript" => tree_sitter_typescript::language_typescript(),
        "rust" => tree_sitter_rust::language(),
        _ => return,
    };
    
    if parser.set_language(language).is_err() {
        return;
    }

    let tree = match parser.parse(source, None) {
        Some(t) => t,
        None => return,
    };

    let root_node = tree.root_node();
    walk_and_match(&root_node, source, file_path, query, matcher, results);
}

fn walk_and_match(node: &Node, source: &str, file_path: &str, query: &str, matcher: &SkimMatcherV2, results: &mut Vec<SearchResult>) {
    let kind = node.kind();

    let is_relevant = match kind {
        "function_declaration" | "class_declaration" | "interface_declaration" | "method_definition" |
        "function_item" | "struct_item" | "trait_item" | "impl_item" | "field_declaration" => true,
        _ => false,
    };

    if is_relevant {
        let start_byte = node.start_byte();
        let end_byte = node.end_byte();
        let node_text = &source[start_byte..end_byte];
        let signature = node_text.split('{').next().unwrap_or(node_text).trim();

        if let Some(score) = matcher.fuzzy_match(signature, query) {
            if score > 60 { // Threshold
                results.push(SearchResult {
                    file: file_path.to_string(),
                    line: node.start_position().row as u32 + 1,
                    match_content: signature.to_string(),
                    score: score,
                });
            }
        }
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        let should_recurse = match kind {
            "program" | "source_file" | "class_declaration" | "impl_item" | "class_body" |
            "declaration_list" | "export_statement" | "mod_item" | "struct_item" | "field_declaration_list" => true,
            _ => false
        };

        if should_recurse || node.kind() == "program" || node.kind() == "source_file" {
             walk_and_match(&child, source, file_path, query, matcher, results);
        }
    }
}

// ============================================================================
// Week 3: Dependency Graph, Resolve Symbol, Find References
// ============================================================================

#[napi]
pub fn build_dependency_graph(path: String) -> Option<DependencyGraph> {
    use std::path::Path;
    use std::collections::HashMap;

    let base_path = Path::new(&path);
    if !base_path.exists() {
        return None;
    }

    let mut nodes: Vec<DependencyNode> = Vec::new();
    let mut edges: Vec<DependencyEdge> = Vec::new();
    let mut file_exports: HashMap<String, Vec<String>> = HashMap::new();

    // First pass: collect all files and their exports
    for entry in WalkDir::new(&path)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            let file_path = entry.path().to_string_lossy().to_string();

            if !file_path.ends_with(".ts") && !file_path.ends_with(".tsx") {
                continue;
            }

            if let Ok(content) = fs::read_to_string(entry.path()) {
                let mut parser = Parser::new();
                let language = tree_sitter_typescript::language_typescript();
                if parser.set_language(language).is_err() {
                    continue;
                }

                if let Some(tree) = parser.parse(&content, None) {
                    let root_node = tree.root_node();
                    let mut imports = Vec::new();
                    let mut exports = Vec::new();

                    extract_imports_exports(&root_node, &content, &mut imports, &mut exports);

                    let export_names: Vec<String> = exports.iter().map(|e| e.name.clone()).collect();
                    file_exports.insert(file_path.clone(), export_names.clone());

                    nodes.push(DependencyNode {
                        file: file_path.clone(),
                        exports: export_names,
                    });

                    // Create edges for imports
                    for import in imports {
                        let is_external = !import.source.starts_with('.')
                            && !import.source.starts_with('/');

                        let resolved_path = if is_external {
                            import.source.clone()
                        } else {
                            // Resolve relative path
                            resolve_import_path(&file_path, &import.source)
                        };

                        edges.push(DependencyEdge {
                            from: file_path.clone(),
                            to: resolved_path,
                            symbols: import.symbols,
                            external: is_external,
                        });
                    }
                }
            }
        }
    }

    Some(DependencyGraph { nodes, edges })
}

fn resolve_import_path(from_file: &str, import_source: &str) -> String {
    use std::path::Path;

    let from_dir = Path::new(from_file).parent().unwrap_or(Path::new("."));
    let import_path = Path::new(import_source);

    // Handle relative paths
    let mut resolved = from_dir.join(import_path);

    // Try adding .ts extension if not present
    if !resolved.exists() {
        let with_ts = resolved.with_extension("ts");
        if with_ts.exists() {
            resolved = with_ts;
        } else {
            // Try index.ts
            let index_path = resolved.join("index.ts");
            if index_path.exists() {
                resolved = index_path;
            }
        }
    }

    resolved.to_string_lossy().to_string()
}

#[napi]
pub fn resolve_symbol(symbol: String, file: String) -> Option<SymbolLocation> {
    let content = match fs::read_to_string(&file) {
        Ok(c) => c,
        Err(_) => return None,
    };

    if !file.ends_with(".ts") && !file.ends_with(".tsx") {
        return None;
    }

    let mut parser = Parser::new();
    let language = tree_sitter_typescript::language_typescript();
    if parser.set_language(language).is_err() {
        return None;
    }

    let tree = parser.parse(&content, None)?;
    let root_node = tree.root_node();

    // First check if symbol is defined locally
    if let Some(info) = find_symbol(&root_node, &content, &symbol, &file) {
        return Some(SymbolLocation {
            file: info.file,
            line: info.line,
            column: 0,
            kind: info.kind,
            external: false,
            package: None,
        });
    }

    // Check if symbol is imported
    let mut imports = Vec::new();
    let mut exports = Vec::new();
    extract_imports_exports(&root_node, &content, &mut imports, &mut exports);

    for import in imports {
        if import.symbols.contains(&symbol) || (import.is_namespace && import.symbols.first() == Some(&symbol)) {
            let is_external = !import.source.starts_with('.')
                && !import.source.starts_with('/');

            if is_external {
                return Some(SymbolLocation {
                    file: String::new(),
                    line: 0,
                    column: 0,
                    kind: "import".to_string(),
                    external: true,
                    package: Some(import.source),
                });
            } else {
                // Resolve to local file
                let resolved_path = resolve_import_path(&file, &import.source);

                // Try to find the actual definition
                if let Ok(imported_content) = fs::read_to_string(&resolved_path) {
                    let mut import_parser = Parser::new();
                    if import_parser.set_language(language).is_ok() {
                        if let Some(import_tree) = import_parser.parse(&imported_content, None) {
                            if let Some(info) = find_symbol(&import_tree.root_node(), &imported_content, &symbol, &resolved_path) {
                                return Some(SymbolLocation {
                                    file: info.file,
                                    line: info.line,
                                    column: 0,
                                    kind: info.kind,
                                    external: false,
                                    package: None,
                                });
                            }
                        }
                    }
                }

                return Some(SymbolLocation {
                    file: resolved_path,
                    line: 0,
                    column: 0,
                    kind: "import".to_string(),
                    external: false,
                    package: None,
                });
            }
        }
    }

    None
}

#[napi]
pub fn find_references(symbol: String, path: String) -> Vec<Reference> {
    use std::path::Path;

    let mut references: Vec<Reference> = Vec::new();
    let base_path = Path::new(&path);

    if !base_path.exists() {
        return references;
    }

    for entry in WalkDir::new(&path)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            let file_path = entry.path().to_string_lossy().to_string();

            if !file_path.ends_with(".ts") && !file_path.ends_with(".tsx") {
                continue;
            }

            if let Ok(content) = fs::read_to_string(entry.path()) {
                find_symbol_references(&content, &file_path, &symbol, &mut references);
            }
        }
    }

    references
}

fn find_symbol_references(content: &str, file_path: &str, symbol: &str, references: &mut Vec<Reference>) {
    let mut parser = Parser::new();
    let language = tree_sitter_typescript::language_typescript();

    if parser.set_language(language).is_err() {
        return;
    }

    let tree = match parser.parse(content, None) {
        Some(t) => t,
        None => return,
    };

    let root_node = tree.root_node();
    let lines: Vec<&str> = content.lines().collect();

    walk_for_references(&root_node, content, file_path, symbol, references, &lines);
}

fn walk_for_references(
    node: &Node,
    source: &str,
    file_path: &str,
    target_symbol: &str,
    references: &mut Vec<Reference>,
    lines: &[&str],
) {
    let kind = node.kind();

    // Check if this is an identifier matching our symbol
    if kind == "identifier" || kind == "type_identifier" || kind == "property_identifier" {
        let start = node.start_byte();
        let end = node.end_byte();
        let text = &source[start..end];

        if text == target_symbol {
            let line_num = node.start_position().row;
            let col = node.start_position().column;

            // Check if this is a definition
            let is_definition = is_definition_context(node);

            let context = if line_num < lines.len() {
                lines[line_num].trim().to_string()
            } else {
                String::new()
            };

            references.push(Reference {
                file: file_path.to_string(),
                line: line_num as u32 + 1,
                column: col as u32,
                context,
                is_definition,
            });
        }
    }

    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_for_references(&child, source, file_path, target_symbol, references, lines);
    }
}

fn is_definition_context(node: &Node) -> bool {
    // Check if the parent is a declaration
    if let Some(parent) = node.parent() {
        let parent_kind = parent.kind();
        match parent_kind {
            "function_declaration" | "class_declaration" | "interface_declaration"
            | "variable_declarator" | "method_definition" | "property_signature"
            | "import_specifier" | "export_specifier" => {
                // Check if this identifier is the "name" of the declaration
                // Usually it's the first identifier child
                let mut cursor = parent.walk();
                for child in parent.children(&mut cursor) {
                    if child.kind() == "identifier" || child.kind() == "type_identifier" {
                        return child.id() == node.id();
                    }
                }
            }
            _ => {}
        }
    }
    false
}
