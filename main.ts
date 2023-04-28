import { Plugin, TAbstractFile } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "make-ex-file",
      name: "Make example file",
			callback: () => {
				app.vault.create("temp.py", "print(\"Hello world\")");
				console.log("File created");
			},
    });
		this.addCommand({
			id: "delete-ex-file",
			name: "Delete example file",
			callback: () => {
				try {
					const file = app.vault.getAbstractFileByPath("temp.py");
					if (file instanceof TAbstractFile) {
						app.vault.delete(file);
						console.log("File deleted");
					}	
					else {
						console.log("File does not exist");
					}
				} catch (error) {
					console.error(error);
				}
			},
		});
  }
}