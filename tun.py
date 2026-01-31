#!/usr/bin/env python3
"""
Simple MOC generator for Obsidian
"""

import os
import re
from pathlib import Path

def create_anchor(text: str) -> str:
    """Create a proper anchor from heading text."""
    # Remove markdown formatting (bold, italic, etc.)
    text = re.sub(r'[*_`]+', '', text)
    
    # Convert to lowercase
    text = text.lower()
    
    # Replace spaces and punctuation with hyphens
    text = re.sub(r'[^\w\s-]', '', text)  # Remove special chars except spaces and hyphens
    text = re.sub(r'[-\s]+', '-', text)    # Replace spaces and multiple hyphens with single hyphen
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    return text

def clean_display_text(text: str) -> str:
    """Clean the display text by removing markdown formatting."""
    # Remove bold/italic markers but keep the text
    return re.sub(r'[*_`]+', '', text).strip()

def main():
    current_dir = Path.cwd()
    moc_content = ["# Map of Content\n", "*Auto-generated from all markdown files*\n"]
    
    # Walk through all directories
    for root, dirs, files in os.walk(current_dir):
        root_path = Path(root)
        
        for file in sorted(files):
            if file.lower().endswith('.md') and file.lower() != 'index.md':
                file_path = root_path / file
                rel_path = file_path.relative_to(current_dir)
                
                # Read and extract headings
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    headings = []
                    for line in content.split('\n'):
                        line = line.strip()
                        if line.startswith('#'):
                            # Count heading level
                            level = 0
                            while level < len(line) and line[level] == '#':
                                level += 1
                            
                            if level > 0 and level <= 6:
                                heading_text = line[level:].strip()
                                if heading_text:
                                    headings.append((level, heading_text))
                    
                    if headings:
                        # Format Obsidian link (without .md extension)
                        obsidian_link = str(rel_path).replace('\\', '/')
                        if obsidian_link.endswith('.md'):
                            obsidian_link = obsidian_link[:-3]
                        
                        moc_content.append(f"\n## [[{obsidian_link}|{file}]]\n")
                        
                        for level, text in headings:
                            indent = '  ' * (level - 1)
                            bullet = '•' if level == 1 else '◦' if level == 2 else '▪'
                            
                            # Create proper anchor
                            anchor = create_anchor(text)
                            
                            # Clean display text
                            display_text = clean_display_text(text)
                            
                            moc_content.append(f"{indent}{bullet} [[{obsidian_link}#{anchor}|{display_text}]]\n")
                
                except Exception as e:
                    print(f"Could not read {file}: {e}")
    
    # Write to index.md
    with open(current_dir / 'index.md', 'w', encoding='utf-8') as f:
        f.writelines(moc_content)
    
    print("✓ MOC generated in index.md")

if __name__ == "__main__":
    main()