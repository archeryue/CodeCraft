#!/usr/bin/env python3
import re
import glob

# Tool name mappings (snake_case to PascalCase)
TOOL_NAMES = {
    'read_file': 'ReadFile',
    'write_file': 'WriteFile',
    'edit_file': 'EditFile',
    'delete_file': 'DeleteFile',
    'list_directory': 'ListDirectory',
    'search_code': 'SearchCode',
    'get_codebase_map': 'GetCodebaseMap',
    'inspect_symbol': 'InspectSymbol',
    'get_imports_exports': 'GetImportsExports',
    'build_dependency_graph': 'BuildDependencyGraph',
    'find_references': 'FindReferences',
    'detect_project_type': 'DetectProjectType',
    'extract_conventions': 'ExtractConventions',
    'get_project_overview': 'GetProjectOverview',
    'bash_output': 'BashOutput',
    'kill_bash': 'KillBash',
    'run_command': 'RunCommand',
    'todo_write': 'TodoWrite',
}

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # 1. Fix import paths: from './foo_bar' -> from './foo-bar'
    content = re.sub(
        r"(from\s+['\"])([^'\"]*?)_([^'\"]*?['\"])",
        lambda m: m.group(1) + m.group(2).replace('_', '-') + '-' + m.group(3),
        content
    )
    content = re.sub(r"from\s+'([^']+)'", lambda m: "from '" + m.group(1).replace('_', '-') + "'", content)
    content = re.sub(r'from\s+"([^"]+)"', lambda m: 'from "' + m.group(1).replace('_', '-') + '"', content)
    
    # 2. Fix tool names: name: 'tool_name' -> name: 'ToolName' (only in tool definitions)
    for old_name, new_name in TOOL_NAMES.items():
        content = re.sub(rf"name:\s*'{old_name}'", f"name: '{new_name}'", content)
        content = re.sub(rf'name:\s*"{old_name}"', f'name: "{new_name}"', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Process all files
files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('tests/**/*.ts', recursive=True) + ['index.ts']
changed = 0
for f in files:
    try:
        if fix_file(f):
            changed += 1
            print(f"✓ {f}")
    except Exception as e:
        print(f"✗ {f}: {e}")

print(f"\n✅ Updated {changed} files")
