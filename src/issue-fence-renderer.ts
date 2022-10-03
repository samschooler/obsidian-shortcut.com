import { MarkdownPostProcessorContext } from "obsidian";
import { ObjectsCache } from "./objects-cache";
import { RenderingCommon } from "./rendering-common";
import { ShortcutClient, ShortcutTicket } from "./shortcut-client";

const TICKET_REGEX = /\d+/i;
const TICKET_LINK_REGEX = /\/([A-Z0-9]+-[0-9]+)\s*$/i;

export class IssueFenceRenderer {
	private _rc: RenderingCommon;
	private _client: ShortcutClient;
	private _cache: ObjectsCache;

	constructor(
		renderingCommon: RenderingCommon,
		client: ShortcutClient,
		cache: ObjectsCache
	) {
		this._rc = renderingCommon;
		this._client = client;
		this._cache = cache;
	}

	async render(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		const renderedItems: Record<string, HTMLElement> = {};
		console.log("rendering", `"${source}"`);
		for (const line of source.split("\n")) {
			const issueKey = this.getTicketKey(line);
			if (issueKey) {
				console.log(`Issue found: ${issueKey}`);
				const cachedIssue = this._cache.get(issueKey);
				if (cachedIssue) {
					if (cachedIssue.isError) {
						renderedItems[issueKey] = this._rc.renderTicketError(
							issueKey,
							cachedIssue.data as string
						);
					} else {
						renderedItems[issueKey] = this._rc.renderTicket(
							cachedIssue.data as ShortcutTicket
						);
					}
				} else {
					// console.log(`Issue not available in the cache`)
					renderedItems[issueKey] =
						this._rc.renderLoadingItem(issueKey);
					this._client
						.getTicket(issueKey)
						.then((newIssue) => {
							const issue = this._cache.add(issueKey, newIssue)
								.data as ShortcutTicket;
							renderedItems[issueKey] =
								this._rc.renderTicket(issue);
							this.updateRenderedIssues(el, renderedItems);
						})
						.catch((err) => {
							this._cache.add(issueKey, err, true);
							renderedItems[issueKey] =
								this._rc.renderTicketError(issueKey, err);
							this.updateRenderedIssues(el, renderedItems);
						});
				}
			}
		}
		this.updateRenderedIssues(el, renderedItems);
	}

	private getTicketKey(line: string): string | null {
		const matches = line.match(TICKET_REGEX);
		if (matches) {
			return matches[0];
		}
		const matchesLink = line.match(TICKET_LINK_REGEX);
		if (matchesLink) {
			return matchesLink[0];
		}
		return null;
	}

	private updateRenderedIssues(
		el: HTMLElement,
		renderedItems: Record<string, HTMLElement>
	): void {
		if (!Object.isEmpty(renderedItems)) {
			el.replaceChildren(
				this._rc.renderContainer(Object.values(renderedItems))
			);
		} else {
			el.replaceChildren(
				this._rc.renderContainer([this.renderNoItems()])
			);
		}
	}

	private renderNoItems(): HTMLElement {
		const tagsRow = createDiv("ji-tags has-addons");
		createSpan({
			cls: "ji-tag is-danger is-light",
			text: "JiraIssue",
			parent: tagsRow,
		});
		createSpan({
			cls: "ji-tag is-danger",
			text: "No valid issues found",
			parent: tagsRow,
		});
		return tagsRow;
	}
}
