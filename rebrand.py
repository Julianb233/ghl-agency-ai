#!/usr/bin/env python3
"""
Rebrand GHL Agency AI to Bottleneck Bots
Updates all text references while keeping file/folder names intact
"""
import os
import re
from pathlib import Path

def should_skip(path):
    """Check if file should be skipped"""
    skip_patterns = [
        'node_modules',
        '.git',
        'package-lock.json',
        '.pyc',
        '__pycache__',
        'dist',
        'build',
        '.cache'
    ]
    return any(pattern in str(path) for pattern in skip_patterns)

def rebrand_file(file_path):
    """Update branding in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        original_content = content

        # Replace "GHL Agency AI" with "Bottleneck Bots"
        content = content.replace('GHL Agency AI', 'Bottleneck Bots')

        # Replace ghl-agency-ai with bottleneck-bots (in configs, helm, etc)
        content = content.replace('ghl-agency-ai', 'bottleneck-bots')

        # Replace domain references (case insensitive)
        content = re.sub(r'ghl\.agency\.ai', 'bottleneckbots.com', content, flags=re.IGNORECASE)

        # Only write if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    base_dir = Path('/root/github-repos/ghl-agency-ai')

    # File extensions to process
    extensions = [
        '.md', '.txt', '.ts', '.tsx', '.js', '.jsx',
        '.yaml', '.yml', '.json', '.py', '.sh',
        '.tpl', '.html', '.css'
    ]

    files_updated = []

    for ext in extensions:
        for file_path in base_dir.rglob(f'*{ext}'):
            if should_skip(file_path):
                continue

            if rebrand_file(file_path):
                files_updated.append(str(file_path.relative_to(base_dir)))

    print(f"\nRebranding complete!")
    print(f"Updated {len(files_updated)} files")

    if files_updated:
        print("\nFiles updated:")
        for f in sorted(files_updated)[:50]:  # Show first 50
            print(f"  - {f}")
        if len(files_updated) > 50:
            print(f"  ... and {len(files_updated) - 50} more")

if __name__ == '__main__':
    main()
