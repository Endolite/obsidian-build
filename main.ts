import { App, Plugin, TAbstractFile, Editor, PluginSettingTab, Setting, MarkdownView } from "obsidian";

//TODO Combine maps into one Map<string, string[]>
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
	timeout: string
	loadTime: string
}

const DEFAULT_SETTINGS: Partial<pluginSettings> = {
	timeout: "10000",
	loadTime: "1000"
}

export default class Build extends Plugin {
	settings: pluginSettings;	
	os = require("os"); // Operating system
	ext = ""; // File extension
	cmd = ""; // Terminal command
	oneF = false; // Whether the temp file can be directly run
	
  async onload() {
		await this.loadSettings();
		await this.clear();
		setTimeout(() => {this.iterateFiles()}, parseInt(this.settings.loadTime));
		
		
		this.addCommand({ // Deletes all possible temp files
			id: "clear",
			name: "Clear",
			callback: () => {
				this.clear();
			}
		});
		
		this.addCommand({ // Reiterates if anything is missed
			id: "reiterate",
			name: "Reiterate",
			callback: () => {
				this.removeRunButtons();
				this.iterateFiles();
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
		let originalExt = this.ext;
		let originalTempF = this.oneF;
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
		this.ext = originalExt;
		this.oneF = originalTempF;
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
			fullCMD += "; osascript -e \'tell app \"Terminal\" to activate\'";
			//console.log(fullCMD);
			exec(fullCMD);
		}
		else {
			console.log("MacOS is the only supported operating system as of now.");
		}
		
		setTimeout(() => {this.deleteFile()}, parseInt(this.settings.timeout));
	}

	private addRunButton(element: HTMLElement, text: string) { // Adds run buttons for all code blocks in the file
		Array.from(element.getElementsByTagName("code")).forEach((codeBlock: HTMLElement) => {
			codeBlock.createEl("button", {text: text, cls: "run-button", attr: {type: "button"}}); //TODO CSS
			//console.log(text);
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
			//console.log(language)

			let temp = extDict.get(language);
			if (typeof(temp) == "string") {
				this.ext = temp;
			}
			temp = cmdDict.get(language);
			if (typeof(temp) == "string") {
				this.cmd = temp;
			}
			let tempB = oneFile.get(language);
			if (typeof(tempB) == "boolean") {
				this.oneF = tempB;
			}
			if (code.substring(code.length - 3) == "Run") {
				code = code.substring(0, code.length - 3);
			}
			//console.log(code);

			this.makeFile(code);
			await this.openTerminal();
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
			.setName("Timeout")
			.setDesc("How long to wait after running to delete the temp file")
			.addText(text => text
				.setPlaceholder("10000")
				.setValue(this.plugin.settings.timeout)
				.onChange(async (value) => {
					this.plugin.settings.timeout = value || "10000";
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Load Time")
			.setDesc("How long to wait after loading a file to add run buttons")
			.addText(text => text
				.setPlaceholder("1000")
				.setValue(this.plugin.settings.loadTime)
				.onChange(async (value) => {
					this.plugin.settings.loadTime = value || "1000";
					await this.plugin.saveSettings();
				}));
	}
}