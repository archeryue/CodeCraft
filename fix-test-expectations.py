#!/usr/bin/env python3
"""
Fix test expectations to use PascalCase tool names and UPPER_SNAKE_CASE error codes
"""

import re
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

def fix_test_file(filepath):
    """Fix test expectations in a test file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix tool name expectations: .toBe('read_file') → .toBe('ReadFile')
    for old_name, new_name in TOOL_NAMES.items():
        # Match patterns like: .toBe('read_file')
        content = re.sub(
            rf"\.toBe\(['\"]{ old_name}['\"]\)",
            f".toBe('{new_name}')",
            content
        )
        # Match patterns like: expect(tool.name).toBe('read_file')
        content = re.sub(
            rf"(expect\([^)]+\.name\)\.toBe\(['\"]){old_name}(['\"]\))",
            rf"\1{new_name}\2",
            content
        )
        # Match patterns like: 'should have name: read_file'
        content = re.sub(
            rf"(should have name:\s+){old_name}",
            rf"\1{new_name}",
            content
        )
        # Match patterns like: tool: 'read_file' in test data
        content = re.sub(
            rf"(tool:\s*['\"]){old_name}(['\"])",
            rf"\1{new_name}\2",
            content
        )
        # Match patterns like: .toInclude('read_file') or .toContain('read_file')
        content = re.sub(
            rf"(\.to(?:Include|Contain)\(['\"]){old_name}(['\"]\))",
            rf"\1{new_name}\2",
            content
        )
        # Match patterns like: 'read_file 3 times' in strings
        content = re.sub(
            rf"(['\"]){old_name}(\s+\d+\s+times['\"])",
            rf"\1{new_name}\2",
            content
        )
        # Match patterns like: expected 'read_file' to be
        content = re.sub(
            rf"(['\"]){old_name}(['\"])",
            rf"\1{new_name}\2",
            content,
            count=0  # Replace all occurrences
        )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    print("=== Fixing Test Expectations ===\n")

    updated_count = 0

    # Find all test files
    for test_file in Path('tests').rglob('*.test.ts'):
        if fix_test_file(test_file):
            updated_count += 1
            print(f"Updated: {test_file}")

    print(f"\nUpdated {updated_count} test files")

if __name__ == '__main__':
    main()
