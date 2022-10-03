import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { IssueFenceRenderer } from "src/issue-fence-renderer";
import { ObjectsCache } from "src/objects-cache";
import { RenderingCommon } from "src/rendering-common";
import { ShortcutClient } from "src/shortcut-client";

// Remember to rename these classes and interfaces!

interface ShortcutSettings {
	shortcutApiKey: string;
}

const DEFAULT_SETTINGS: ShortcutSettings = {
	shortcutApiKey: "",
};

export default class Shortcut extends Plugin {
	_settings: ShortcutSettings;
	_cache: ObjectsCache;
	_client: ShortcutClient;
	_renderingCommon: RenderingCommon;
	_issueFenceRenderer: IssueFenceRenderer;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "obsidian-shortcut-ticket-template-fence",
			name: "Insert Shortcut Ticket Template",
			editorCallback: (editor: Editor, _: MarkdownView) => {
				editor.replaceRange(
					"```shortcut-ticket\n\n```",
					editor.getCursor()
				);
			},
		});

		this._cache = new ObjectsCache();
		this._client = new ShortcutClient(this._settings.shortcutApiKey);
		this._renderingCommon = new RenderingCommon(this.app, this._client);

		this._issueFenceRenderer = new IssueFenceRenderer(
			this._renderingCommon,
			this._client,
			this._cache
		);
		this.registerMarkdownCodeBlockProcessor(
			"shortcut-ticket",
			this._issueFenceRenderer.render.bind(this._issueFenceRenderer)
		);

		this.addSettingTab(new ShortcutSettingTab(this.app, this));
	}

	async loadSettings() {
		this._settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this._settings);
	}

	onunload() {
		this._settings = null;
		this._cache = null;
		this._client = null;
		this._renderingCommon = null;
		this._issueFenceRenderer = null;
	}
}

class ShortcutSettingTab extends PluginSettingTab {
	plugin: Shortcut;

	constructor(app: App, plugin: Shortcut) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Your Shortcut API Token")
			.setDesc(
				"Go to https://app.shortcut.com/<your-workspace>/settings/account/api-tokens to get your token."
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter your token")
					.setValue(this.plugin._settings.shortcutApiKey)
					.onChange(async (value) => {
						console.log("Shortcut API Token: " + value);
						this.plugin._settings.shortcutApiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
