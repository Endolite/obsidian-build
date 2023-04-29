import { MarkdownView, Plugin, TAbstractFile, Editor } from "obsidian";
import { detectNewline } from "detect-newline";

let extDict = new Map<string, string>();
extDict.set("python", "py");

let cmdDict = new Map<string, string>();
cmdDict.set("python", "python3");

export default class ExamplePlugin extends Plugin {
	ext = "";
	cmd = "";
  async onload() {
		this.addCommand({
			id: "read-file",
			name: "Read file",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let sel = editor.getSelection();
				let n = 0;
				while (detectNewline(sel.substring(n, n + 1)) != '\n') {
					n++;
				} 
				let lang = sel.substring(3, n);
				let temp = extDict.get(lang);
				if (typeof temp === "string"){
					this.ext = temp;
					console.log("Extension: " + this.ext);
				}
				temp = cmdDict.get(lang);
				if (typeof temp === "string"){
					this.cmd = temp;
					console.log("Command: " + this.cmd);
				}
				console.log("Language: " + lang);
				sel = sel.substring(n + 1, sel.length - 4);
				try {
					this.makeFile(sel);
					this.openTerminal();
				} catch (error) {
					console.log(error);
				}
			}
		}),

		this.addCommand({
			id: "clear",
			name: "Clear",
			callback: () => {
				this.deleteFile();
			}
		})
		this.addCommand({
			id: "open-terminal",
			name: "Open terminal",
			callback: () =>{
				this.openTerminal();
			}
		})
  }

	async makeFile(text: string){
		app.vault.create("temp." + this.ext, text);
		console.log("File created");
	}

	async deleteFile() {
		const file = app.vault.getAbstractFileByPath("temp." + this.ext);
		if (file instanceof TAbstractFile) {
			app.vault.delete(file);
			console.log("File deleted");
		}	
		else {
			console.log("File does not exist");
		}
	}

	async openTerminal() {
		console.log("what: temp." + this.ext);
		const { exec } = require("child_process");
		let path = this.app.vault.adapter.getResourcePath("temp" + this.ext);
		console.log("uhh: " + path);
		let n = path.length - 1;
		while (path.charAt(n) != '/') {
			n--;
		}
		path = path.substring(24, n + 1) + "temp." + this.ext;
		console.log("hmm:" + path);
		exec("osascript -e \'tell app \"Terminal\" to do script \"" + this.cmd + " " + path + "\"\'");
	}

}