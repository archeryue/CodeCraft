#!/usr/bin/env python3
"""
Careful refactoring script that:
1. Updates import paths from snake_case to kebab-case
2. Updates tool names from snake_case to PascalCase
3. DOES NOT change error codes, variable names, or built-in modules
"""

import os
import re
import subprocess
from pathlib import Path

# Tool name mappings
TOOL_NAMES = {
    'read_file': 'ReadFile',
    'write_file': 'WriteFile',
    'edit_file': 'EditFile',
    'delete_file': 'DeleteFile',
    'list_directory': 'ListDirectory',
    'glob': 'Glob',
    'grep': 'Grep',
    'get_codebase_map': 'GetCodebaseMap',
    'search_code': 'SearchCode',
    'inspect_symbol': 'InspectSymbol',
    'get_imports_exports': 'GetImportsExports',
    'find_references': 'FindReferences',
    'build_dependency_graph': 'BuildDependencyGraph',
    'detect_project_type': 'DetectProjectType',
    'extract_conventions': 'ExtractConventions',
    'get_project_overview': 'GetProjectOverview',
    'bash': 'Bash',
    'bash_output': 'BashOutput',
    'kill_bash': 'KillBash',
    'run_command': 'RunCommand',
    'todo_write': 'TodoWrite',
}

def snake_to_kebab(name):
    """Convert snake_case to kebab-case"""
    return name.replace('_', '-')

def find_ts_files(root_dir='.'):
    """Find all TypeScript files"""
    for root, dirs, files in os.walk(root_dir):
        # Skip node_modules and other directories
        if 'node_modules' in root or '.git' in root or 'rust_engine' in root:
            continue
        for file in files:
            if file.endswith('.ts'):
                yield os.path.join(root, file)

def update_imports_only(content):
    """Update only import/from statements, converting snake_case to kebab-case in paths"""
    # Pattern for import statements with paths
    # Matches: from './foo_bar' or from '../foo_bar/baz_qux'
    def replace_import_path(match):
        prefix = match.group(1)  # 'from ' or 'import '
        quote = match.group(2)   # ' or "
        path = match.group(3)    # the actual path

        # Only modify relative paths (starting with . or ..)
        if path.startswith('.'):
            # Don't change node built-in modules
            if path in ['child_process', 'fs', 'path', 'os']:
                return match.group(0)
            # Convert snake_case to kebab-case in the path
            path = snake_to_kebab(path)

        return f"{prefix}{quote}{path}{quote}"

    # Match: from 'path' or import 'path' or from "path" or import "path"
    pattern = r"((?:from|import)\s+)(['\"])([^'\"]+)\2"
    content = re.sub(pattern, replace_import_path, content)

    return content

def update_tool_names_in_definitions(content):
    """Update tool names in tool definitions only (name: 'tool_name')"""
    for old_name, new_name in TOOL_NAMES.items():
        # Match: name: 'tool_name' or name: "tool_name"
        # Be very specific to avoid changing other strings
        content = re.sub(
            rf"(name:\s*['\"]){old_name}(['\"])",
            rf"\1{new_name}\2",
            content
        )
    return content

def fix_file(filepath):
    """Fix a single TypeScript file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Update import paths
        content = update_imports_only(content)

        # Update tool names in definitions
        content = update_tool_names_in_definitions(content)

        # Only write if changed
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def rename_files():
    """Rename all snake_case files to kebab-case using git mv"""
    files_to_rename = []

    # Find all TypeScript files with underscores
    for filepath in find_ts_files():
        filename = os.path.basename(filepath)
        dirname = os.path.dirname(filepath)

        if '_' in filename:
            new_filename = snake_to_kebab(filename)
            new_filepath = os.path.join(dirname, new_filename)
            files_to_rename.append((filepath, new_filepath))

    # Rename using git mv
    print(f"Renaming {len(files_to_rename)} files...")
    for old_path, new_path in files_to_rename:
        try:
            subprocess.run(['git', 'mv', old_path, new_path], check=True, capture_output=True)
            print(f"  {old_path} → {new_path}")
        except subprocess.CalledProcessError as e:
            print(f"  ERROR: Failed to rename {old_path}: {e.stderr.decode()}")

    return len(files_to_rename)

def main():
    print("=== Careful Refactoring Script ===\n")

    # Step 1: Rename files
    print("Step 1: Renaming files from snake_case to kebab-case...")
    renamed_count = rename_files()
    print(f"Renamed {renamed_count} files\n")

    # Step 2: Update imports and tool names in all TypeScript files
    print("Step 2: Updating imports and tool names...")
    updated_count = 0
    for filepath in find_ts_files():
        if fix_file(filepath):
            updated_count += 1
            print(f"  Updated: {filepath}")

    print(f"\nUpdated {updated_count} files")
    print("\n=== Done ===")

if __name__ == '__main__':
    main()
