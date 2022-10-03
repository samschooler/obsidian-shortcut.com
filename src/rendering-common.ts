import { App, FrontMatterCache, TFile } from "obsidian";
import {
	ShortcutClient,
	ShortcutTicket,
	ShortcutWorkflowStateType,
} from "./shortcut-client";

export const JIRA_STATUS_COLOR_MAP: Record<string, string> = {
	"blue-gray": "is-info",
	yellow: "is-warning",
	green: "is-success",
	red: "is-danger",
	"medium-gray": "is-dark",
	unstarted: "is-dark",
	started: "is-info",
	done: "is-success",
};

export class RenderingCommon {
	private _app: App;
	private _client: ShortcutClient;

	constructor(app: App, client: ShortcutClient) {
		this._app = app;
		this._client = client;
	}

	public getColorFromType(type: ShortcutWorkflowStateType): string {
		return JIRA_STATUS_COLOR_MAP[type] ?? "is-info";
	}

	public getTheme(): string {
		return "is-dark";
	}

	public getNotes(): TFile[] {
		return this._app.vault.getMarkdownFiles();
	}

	public getFrontMatter(file: TFile): FrontMatterCache | undefined {
		return this._app.metadataCache.getFileCache(file)?.frontmatter;
	}

	public renderContainer(children: HTMLElement[]): HTMLElement {
		const container = createDiv({ cls: "jira-issue-container" });
		for (const child of children) {
			container.appendChild(child);
		}
		return container;
	}

	public renderLoadingItem(item: string, inline = false): HTMLElement {
		let tagsRow;
		if (inline) {
			tagsRow = createSpan({ cls: "ji-tags has-addons" });
		} else {
			tagsRow = createDiv({ cls: "ji-tags has-addons" });
		}
		createSpan({
			cls: "spinner",
			parent: createSpan({
				cls: `ji-tag ${this.getTheme()}`,
				parent: tagsRow,
			}),
		});
		createEl("a", {
			cls: `ji-tag is-link ${this.getTheme()}`,
			text: item,
			parent: tagsRow,
		});
		createSpan({
			cls: `ji-tag ${this.getTheme()}`,
			text: "Loading ...",
			parent: tagsRow,
		});
		return tagsRow;
	}

	public renderTicket(ticket: ShortcutTicket, compact = false): HTMLElement {
		const tagsRow = createDiv("ji-tags has-addons");
		createEl("img", {
			cls: "fit-content",
			attr: {
				src: "https://shortcut.com/icons/icon-48x48.png",
				alt: ticket.name,
			},
			title: ticket.name,
			parent: createSpan({
				cls: `ji-tag ${this.getTheme()} ji-sm-tag`,
				parent: tagsRow,
			}),
		});
		createEl("a", {
			cls: `ji-tag is-link ${this.getTheme()} no-wrap`,
			href: ticket.app_url,
			title: ticket.app_url,
			text: `${ticket.id}`,
			parent: tagsRow,
		});
		if (!compact) {
			createSpan({
				cls: `ji-tag ${this.getTheme()} ticket-summary`,
				text: ticket.name,
				parent: tagsRow,
			});
		}

		const workflowState = this._client.getWorkflowState(
			ticket.workflow_state_id
		);
		createSpan({
			cls: `ji-tag no-wrap ${this.getColorFromType(workflowState.type)}`,
			attr: workflowState.color
				? {
						style: `background-color: ${workflowState.color}`,
				  }
				: undefined,
			text: workflowState.name,
			title: workflowState.name,
			parent: tagsRow,
		});
		return tagsRow;
	}

	public renderTicketError(ticketKey: string, message: string): HTMLElement {
		const tagsRow = createDiv("ji-tags has-addons");
		createSpan({ cls: "ji-tag is-delete is-danger", parent: tagsRow });
		createSpan({
			cls: "ji-tag is-danger is-light",
			text: ticketKey,
			parent: tagsRow,
		});
		createSpan({ cls: "ji-tag is-danger", text: message, parent: tagsRow });
		return tagsRow;
	}
}
