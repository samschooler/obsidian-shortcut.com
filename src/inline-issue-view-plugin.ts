import { StateField } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	MatchDecorator,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { ObjectsCache } from "./objects-cache";
import { RenderingCommon } from "./rendering-common";
import { ShortcutClient, ShortcutTicket } from "./shortcut-client";

class InlineIssueWidget extends WidgetType {
	private _ticketKey: string;
	private _compact: boolean;
	private _rc: RenderingCommon;
	private _client: ShortcutClient;
	private _cache: ObjectsCache;
	private _htmlContainer: HTMLElement;
	constructor(
		key: string,
		compact: boolean,
		renderingCommon: RenderingCommon,
		client: ShortcutClient,
		cache: ObjectsCache
	) {
		super();
		this._ticketKey = key;
		this._compact = compact;
		this._rc = renderingCommon;
		this._client = client;
		this._cache = cache;
		this._htmlContainer = createSpan({
			cls: "ji-inline-issue jira-issue-container",
		});
		this.buildTag();
	}

	buildTag() {
		const cachedIssue = this._cache.get(this._ticketKey);
		if (cachedIssue) {
			if (cachedIssue.isError) {
				this._htmlContainer.replaceChildren(
					this._rc.renderTicketError(
						this._ticketKey,
						cachedIssue.data as string
					)
				);
			} else {
				this._htmlContainer.replaceChildren(
					this._rc.renderTicket(
						cachedIssue.data as ShortcutTicket,
						this._compact
					)
				);
			}
		} else {
			this._htmlContainer.replaceChildren(
				this._rc.renderLoadingItem(this._ticketKey)
			);
			this._client
				.getTicket(this._ticketKey)
				.then((newTicket) => {
					const issue = this._cache.add(this._ticketKey, newTicket)
						.data as ShortcutTicket;
					this._htmlContainer.replaceChildren(
						this._rc.renderTicket(issue, this._compact)
					);
				})
				.catch((err) => {
					this._cache.add(this._ticketKey, err, true);
					this._htmlContainer.replaceChildren(
						this._rc.renderTicketError(this._ticketKey, err)
					);
				});
		}
	}

	toDOM(view: EditorView): HTMLElement {
		return this._htmlContainer;
	}
}

// Global variable with the last instance of the MatchDecorator rebuilt every time the settings are changed
let matchDecorator: MatchDecorator;

function buildMatchDecorator(
	renderingCommon: RenderingCommon,
	client: ShortcutClient,
	cache: ObjectsCache
) {
	return new MatchDecorator({
		regexp: new RegExp(`(-?)([A-Z0-9]+-[0-9]+)`, "g"),
		decoration: (match: RegExpExecArray, view: EditorView, pos: number) => {
			const compact = !!match[1];
			const key = match[2];
			const cursor = view.state.selection.main.head;
			// TODO: improve this type cast
			if (
				!view.state.field(
					editorLivePreviewField as unknown as StateField<boolean>
				) ||
				(cursor > pos - 1 && cursor < pos + match[0].length + 1)
			) {
				return Decoration.mark({
					tagName: "div",
					class: "HyperMD-codeblock HyperMD-codeblock-bg jira-issue-inline-mark",
				});
			} else {
				return Decoration.replace({
					widget: new InlineIssueWidget(
						key,
						compact,
						renderingCommon,
						client,
						cache
					),
				});
			}
		},
	});
}

class ViewPluginClass implements PluginValue {
	decorators: DecorationSet;

	constructor(view: EditorView) {
		this.decorators = matchDecorator.createDeco(view);
	}

	update(update: ViewUpdate): void {
		// TODO: improve this type cast
		const editorModeChanged =
			update.startState.field(
				editorLivePreviewField as unknown as StateField<boolean>
			) !==
			update.state.field(
				editorLivePreviewField as unknown as StateField<boolean>
			);
		if (
			update.docChanged ||
			update.startState.selection.main !== update.state.selection.main ||
			editorModeChanged
		) {
			this.decorators = matchDecorator.createDeco(update.view);
		}
	}

	destroy(): void {
		this.decorators = null;
	}
}

const ViewPluginSpec: PluginSpec<ViewPluginClass> = {
	decorations: (viewPlugin) => viewPlugin.decorators,
};

export class ViewPluginManager {
	private _rc: RenderingCommon;
	private _viewPlugin: ViewPlugin<ViewPluginClass>;
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
		this.update();
		this._viewPlugin = ViewPlugin.fromClass(
			ViewPluginClass,
			ViewPluginSpec
		);
	}

	update() {
		matchDecorator = buildMatchDecorator(
			this._rc,
			this._client,
			this._cache
		);
	}

	getViewPlugin(): ViewPlugin<ViewPluginClass> {
		return this._viewPlugin;
	}
}
