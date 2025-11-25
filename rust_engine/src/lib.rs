#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use regex::Regex;
use std::fs;
use walkdir::WalkDir;

#[napi]
pub fn generate_repo_map(path: String) -> String {
  let mut repo_map = String::new();
  let function_regex = Regex::new(r"(?m)^\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+\s*|<(?:function|const|let|var)\s+\w+\s*=\s*(?:async)?\s*\(|class\s+\w+\s*\{)").unwrap();

  for entry in WalkDir::new(path)
    .into_iter()
    .filter_entry(|e| !is_hidden(e))
    .filter_map(|e| e.ok())
  {
    if entry.file_type().is_file() {
      if let Ok(content) = fs::read_to_string(entry.path()) {
        let file_path = entry.path().display().to_string();
        repo_map.push_str(&format!("\n---\nFile: {}\n", file_path));
        for mat in function_regex.find_iter(&content) {
            repo_map.push_str(mat.as_str());
            repo_map.push('\n');
        }
      }
    }
  }

  repo_map
}

fn is_hidden(entry: &walkdir::DirEntry) -> bool {
  entry
    .file_name()
    .to_str()
    .map(|s| s.starts_with('.') || s == "node_modules")
    .unwrap_or(false)
}
