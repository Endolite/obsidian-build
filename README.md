# obsidian-build
A WIP plugin for Obsidian that will
1. identify the language of a codeblock
2. create a file containing the content of the codeblock with the appropriate extension in the root directory of the repository
3. run the file in the terminal with the appropriate command and
4. delete the file.

It currently works on MacOS for Python, Java, and C++, though the autodelete isn't full working (the last temp file file before a restart of Obsidian isn't deleted).
