// Temp.ts
import { App, Plugin, TAbstractFile, Editor, PluginSettingTab, Setting, MarkdownView } from "obsidian";
import { detectNewline } from "detect-newline";

let extDict = new Map<string, string>(); // Map of file extensions
	extDict.set("cpp", "cpp");
	extDict.set("java", "java");
	extDict.set("lua", "lua");
	extDict.set("python", "py");

let cmdDict = new Map<string, string>(); // Map of terminal commands
	cmdDict.set("cpp", "make")
	cmdDict.set("java", "java");
	cmdDict.set("lua", "lua");
	cmdDict.set("python", "python3");

let oneFile = new Map<string, boolean>(); // Map of whether the temp file can be directly run
	oneFile.set("cpp", false);
	oneFile.set("java", true);
	oneFile.set("lua", true);
	oneFile.set("python", true);

interface pluginSettings {
	terminal: string;
}

const DEFAULT_SETTINGS: Partial<pluginSettings> = {
	terminal: "Terminal",
}

export default class Build extends Plugin {
	settings: pluginSettings;	
	os = require("os"); // Operating system
	ext = ""; // File extension
	cmd = ""; // Terminal command
	oneF = false; // Whether the temp file can be directly run
	
  async onload() {

		await this.loadSettings();
		await this.iterateFiles();
		await this.clear();

		this.addCommand({
			id: "iterate",
			name: "Iterate",
			editorCallback: (editor: Editor) => {
				this.iterateFiles();
			}
		});

		this.addCommand({
			id: "build",
			name: "Build",
			editorCallback: (editor: Editor) => {
				//this.deleteFile(); // Clears the previous temp file before the new extension is identified
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
				this.deleteFile();
			} 
		});

		this.addCommand({ // Deletes all possible temp files
			id: "clear",
			name: "Clear",
			callback: () => {
				this.clear();
			}
		});

		this.addCommand({ // Opens a new terminal instance
			id: "open-terminal",
			name: "Open terminal",
			callback: () => {
				this.openTerminal();
			}
		});

		this.addSettingTab(new BuildSettingsTab(this.app, this));
  }

	async onunload() {
		this.deleteFile();
		this.removeRunButtons();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async makeFile(text: string) { // Creates the temp file (with appropriate extension) from input text
		await this.clear();
		app.vault.create("temp." + this.ext, text);
	//console.log("File created");
	}

	async deleteFile() { // Deletes the temp file(s)
		let file;
		if (!this.oneF) {
			file = app.vault.getAbstractFileByPath("temp");
			if (file instanceof TAbstractFile) {
				app.vault.delete(file);
				//console.log("Build file deleted");
			}	
		}
		file = app.vault.getAbstractFileByPath("temp." + this.ext);
		if (file instanceof TAbstractFile) {
			app.vault.delete(file);
			//console.log("Temp file deleted");
		}	
		else {
			//console.log("File does not exist");
		}
	}

	async clear() { // Deletes all possible temp files
		let tempExt;
		let tempF;
		for (let key of Array.from(extDict.keys())) {
			tempExt = extDict.get(key);
			tempF = oneFile.get(key);
			if ((typeof(tempExt) === "string") && (typeof(tempF) == "boolean")) {
				this.ext = tempExt;
				this.oneF = tempF;
				try {
					this.deleteFile();
				}
				catch (error) {
					console.log(error);
				}
			}
		}
		console.log("Cleared")
	}

	async openTerminal() { // Opens a new terminal instance and runs the temp file
		const { exec } = require("child_process");
		
		let path = this.app.vault.adapter.getResourcePath("temp" + this.ext); // Get's the path to the temp file before properly formatting it
		//console.log("Original path: " + path);
		let n = path.length - 1;
		while (path.charAt(n) != '/') {
			n--;
		}
		let n1 = 0;
		let n2 = 0;
		for (let i = 0; (i < path.length) && (n1 < 3); i++) {
			if (path.charAt(i) == '/') {
				n2 = i;
				n1++;
			}
		}
		path = path.substring(n2, n + 1) + "temp"
		//console.log("Usable path: " + path);
		
		// TODO make unix/powershell commands
		let fullCMD = ""; // Command to run in the terminal
		if (this.os.platform() == "darwin") { // Detects if the user is on MacOS
			fullCMD = "osascript -e \'tell app \"Terminal\" to do script \"" + this.cmd + " " + path;
			if (this.oneF) {
				fullCMD += "." + this.ext + "\"\'";
			}
			else {
				fullCMD += " && " + path  + "\"\'";
			}
			// TODO bring created terminal window to the front
			// fullCMD += "\'";
			exec(fullCMD);
		}
		else {
			console.log("MacOS is the only supported operating system as of now.");
		}
	}

	private addRunButton(element: HTMLElement, text: string) { // Adds run buttons for all code blocks in the file
		Array.from(element.getElementsByTagName("code")).forEach((codeBlock: HTMLElement) => {
			codeBlock.createEl("button", {text: text, cls: "run-button", attr: {type: "button"}});
			console.log(text);
			const code = codeBlock.getText();
			const language = codeBlock.className;
			this.addListenerToRunButton(codeBlock, code, language);
		});
	}

	async iterateFiles() { // Iterates through all code blocks in the file
		this.app.workspace.iterateRootLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				this.addRunButton(leaf.view.contentEl, "Run");
			}
		});
	}

	private addListenerToRunButton(codeBlock: HTMLElement, code: string, language: string) {
		const runButton = codeBlock.getElementsByClassName("run-button")[0];
		runButton.addEventListener("click", async () => { // Gives the run button functionality
			//console.log("Clicked");
			//console.log(code);
			if (language.substring(0, 9) == "is-loaded") {
				language = language.substring(19);
			}
			else if (language.substring(0, 9) == "language-") {
				language = language.substring(9, language.indexOf("\ "));
			}
			let temp = extDict.get(language);
			sameTypeDef(this.ext, temp);
			temp = cmdDict.get(language);
			sameTypeDef(this.cmd, temp);
			let tempB = oneFile.get(language);
			sameTypeDef(this.oneF, tempB);
			if (code.substring(code.length - 3) == "Run") {
				code = code.substring(0, code.length - 3);
			}

			console.log(code);
			this.makeFile(code);
			await this.openTerminal();
			//await this.deleteFile();
		});
	}

	private removeRunButton(element: HTMLElement) { // Removes run buttons from all code blocks in the file
		Array.from(element.getElementsByClassName("run-button")).forEach((runButton: HTMLElement) => {
			runButton.remove();
		});
	}
	
	private removeRunButtons() { // Removes run buttons from all code blocks in the loaded file
		this.app.workspace.iterateRootLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				this.removeRunButton(leaf.view.contentEl);
			}
		});
	}
}

class BuildSettingsTab extends PluginSettingTab {
	plugin: Build;

	constructor(app: App, plugin: Build) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", {text: "Build Settings"});
		new Setting(containerEl)
			.setName("Terminal")
			.setDesc("The terminal to use when running the temp file")
			.addText(text => text
				.setPlaceholder("Terminal")
				.setValue(this.plugin.settings.terminal)
				.onChange(async (value) => {
					this.plugin.settings.terminal = value;
					await this.plugin.saveSettings();
				}));
	}
}

function sameTypeDef<Type>(A: Type, B: Type) {
	if (typeof(A) == typeof(B)) {
		A = B;
	}
}