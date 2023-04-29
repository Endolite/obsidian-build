import { MarkdownView, Plugin, TAbstractFile, Editor } from "obsidian";
import { detectNewline } from "detect-newline";

let extDict = new Map<string, string>(); // Map of file extensions
extDict.set("cpp", "cpp");
extDict.set("java", "java");
extDict.set("python", "py");

let cmdDict = new Map<string, string>(); // Map of terminal commands
cmdDict.set("cpp", "make")
cmdDict.set("java", "java");
cmdDict.set("python", "python3");


let oneFile = new Map<string, boolean>(); // Map of whether a build file is required
oneFile.set("cpp", false);
oneFile.set("java", true);
oneFile.set("python", true);

export default class ExamplePlugin extends Plugin {
	ext = ""; // File extension
	cmd = ""; // Terminal command
	oneF = false;
  async onload() {
		this.addCommand({
			id: "build",
			name: "Build",
			editorCallback: (editor: Editor) => {
				this.deleteFile(); // Clears the previous temp file before the new extension is identified

				let sel = editor.getSelection(); // Makes a string from the user's mouse selection

				if (sel.substring(0, 3) === "```" && sel.substring(sel.length - 3) === "```") { // Makes sure a valid selection is made
					let n = 0;
					while (detectNewline(sel.substring(n, n + 1)) != '\n') { // Finds the specified language by going back from the first newline character
						n++;
					} 
					let lang = sel.substring(3, n);
					//console.log("Language: " + lang);
					let temp = extDict.get(lang);
					if (typeof temp === "string") {
						this.ext = temp;
						//console.log("Extension: " + this.ext);
					}
					temp = cmdDict.get(lang);
					if (typeof temp === "string") {
						this.cmd = temp;
						//console.log("Command: " + this.cmd);
					}
					let tempB = oneFile.get(lang);
					if (typeof tempB === "boolean") {
						this.oneF = tempB;
						//console.log("One file: " + this.oneF);
					}

					sel = sel.substring(n + 1, sel.length - 4); // Truncates the delimiters of the code block
					try {
						this.makeFile(sel); // Creates a file for the selection
						this.openTerminal();
					} 
					catch (error) {
						console.log(error);
					}
				} 
				else {
					console.log("Invalid selection");
				}
			} 
		}),

		this.addCommand({ // Deletes the temp file
			id: "clear",
			name: "Clear",
			callback: () => {
				var temp;
				for (let key of Array.from(extDict.keys())) {
					temp = extDict.get(key);
					if (typeof(temp) === "string") {
						this.ext = temp;
						this.deleteFile();
					}
				}
			}
		})
		this.addCommand({ // Open a new terminal instance
			id: "open-terminal",
			name: "Open terminal",
			callback: () =>{
				this.openTerminal();
			}
		})
  }

	async makeFile(text: string) { // Creates the temp (with appropriate extension) file from input text
		app.vault.create("temp." + this.ext, text);
		console.log("File created");
	}

	async deleteFile() { // Deletes the temp file(s)
		if (!this.oneF) {
			var file = app.vault.getAbstractFileByPath("temp");
			if (file instanceof TAbstractFile) {
				app.vault.delete(file);
				console.log("Build file deleted");
			}	
		}
		var file = app.vault.getAbstractFileByPath("temp." + this.ext);
		if (file instanceof TAbstractFile) {
			app.vault.delete(file);
			console.log("Temp file deleted");
		}	
		else {
			//console.log("File does not exist");
		}
	}

	async openTerminal() { // Opens a new terminal instance and runs the temp file
		const { exec } = require("child_process");
		let path = this.app.vault.adapter.getResourcePath("temp" + this.ext);
		//console.log("Original path: " + path);
		let n = path.length - 1;
		while (path.charAt(n) != '/'){
			n--;
		}
		path = path.substring(24, n + 1) + "temp"
		//console.log("Usable path:" + path);
		if (this.oneF) {
			exec("osascript -e \'tell app \"Terminal\" to do script \"" + this.cmd + " " + path + "." + this.ext + "\"\'");
		}
		else {
			exec("osascript -e \'tell app \"Terminal\" to do script \"" + this.cmd + " " + path + " && " + path  + "\"\'");
		}
	}

}