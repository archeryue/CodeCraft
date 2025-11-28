#!/usr/bin/env python3
"""
Fix tool names in evaluation datasets from snake_case to PascalCase
"""

import json
import os
import glob

# Tool name mappings from snake_case to PascalCase
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
    'build_dependency_graph': 'BuildDependencyGraph',
    'find_references': 'FindReferences',
    'detect_project_type': 'DetectProjectType',
    'extract_conventions': 'ExtractConventions',
    'get_project_overview': 'GetProjectOverview',
    'bash': 'Bash',
    'bash_output': 'BashOutput',
    'kill_bash': 'KillBash',
    'todo_write': 'TodoWrite'
}

def fix_dataset(filepath):
    """Update tool names in a dataset JSON file"""
    print(f"Processing {filepath}...")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        changes = 0

        # Update tool names in test cases
        if isinstance(data, list):
            for case in data:
                if 'tool' in case:
                    old_tool = case['tool']
                    if old_tool in TOOL_NAMES:
                        case['tool'] = TOOL_NAMES[old_tool]
                        changes += 1
        elif isinstance(data, dict):
            if 'tool' in data:
                old_tool = data['tool']
                if old_tool in TOOL_NAMES:
                    data['tool'] = TOOL_NAMES[old_tool]
                    changes += 1

            # Handle nested test cases
            if 'cases' in data and isinstance(data['cases'], list):
                for case in data['cases']:
                    if 'tool' in case:
                        old_tool = case['tool']
                        if old_tool in TOOL_NAMES:
                            case['tool'] = TOOL_NAMES[old_tool]
                            changes += 1

                    # Fix LLM evaluation expected tool names
                    if 'expected' in case and isinstance(case['expected'], dict):
                        expected = case['expected']

                        # Fix expectedTool
                        if 'expectedTool' in expected and expected['expectedTool'] in TOOL_NAMES:
                            expected['expectedTool'] = TOOL_NAMES[expected['expectedTool']]
                            changes += 1

                        # Fix forbiddenTools list
                        if 'forbiddenTools' in expected and isinstance(expected['forbiddenTools'], list):
                            new_forbidden = []
                            for tool in expected['forbiddenTools']:
                                if tool in TOOL_NAMES:
                                    new_forbidden.append(TOOL_NAMES[tool])
                                    changes += 1
                                else:
                                    new_forbidden.append(tool)
                            expected['forbiddenTools'] = new_forbidden

                        # Fix acceptableTools list
                        if 'acceptableTools' in expected and isinstance(expected['acceptableTools'], list):
                            new_acceptable = []
                            for tool in expected['acceptableTools']:
                                if tool in TOOL_NAMES:
                                    new_acceptable.append(TOOL_NAMES[tool])
                                    changes += 1
                                else:
                                    new_acceptable.append(tool)
                            expected['acceptableTools'] = new_acceptable

        if changes > 0:
            # Write back to file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"  ✓ Updated {changes} tool references")
        else:
            print(f"  - No changes needed")

        return changes

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return 0

def main():
    print("Fixing tool names in evaluation datasets...\n")

    # Find all JSON files in evals/datasets
    dataset_files = glob.glob('evals/datasets/**/*.json', recursive=True)

    total_changes = 0
    for filepath in sorted(dataset_files):
        changes = fix_dataset(filepath)
        total_changes += changes

    print(f"\n✨ Complete! Updated {total_changes} tool references across {len(dataset_files)} files")

if __name__ == '__main__':
    main()
