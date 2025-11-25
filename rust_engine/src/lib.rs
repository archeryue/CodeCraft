#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
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
        "function_item" | "struct_item" | "trait_item" | "impl_item" => true,
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
            "program" | "source_file" | "class_declaration" | "impl_item" | "class_body" | "declaration_list" | "export_statement" | "mod_item" => true,
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
        "function_item" | "struct_item" | "trait_item" | "impl_item" => true,
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
            "program" | "source_file" | "class_declaration" | "impl_item" | "class_body" | "declaration_list" | "export_statement" | "mod_item" => true,
            _ => false
        };

        if should_recurse || node.kind() == "program" || node.kind() == "source_file" {
             walk_and_match(&child, source, file_path, query, matcher, results);
        }
    }
}
