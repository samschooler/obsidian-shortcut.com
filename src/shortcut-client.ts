import { requestUrl } from "obsidian";

export interface ShortcutTicket {
	id: number;
	app_url: string;
	name: string;
	workflow_state_id: number;
}

export interface Workflow {
	id: number;
	name: string;
	states: WorkflowState[];
}

export interface WorkflowState {
	id: number;
	name: string;
	color: string;
	type: ShortcutWorkflowStateType;
}

export type ShortcutWorkflowStateType = "unstarted" | "started" | "done";

export class ShortcutClient {
	_apiToken: string;
	_workflowsStates: { [workflowStateId: number]: WorkflowState } = {};

	constructor(apiKey: string) {
		this._apiToken = apiKey;
		this.consturctWorkflowStates();
	}

	async consturctWorkflowStates() {
		const workflows = await this.getWorkflowStates();
		console.log("Loaded states", workflows);
		workflows
			.flatMap((w) => w.states)
			.forEach((state) => {
				this._workflowsStates[state.id] = state;
			});
	}

	async getTicket(storyId: string): Promise<ShortcutTicket> {
		const res = await requestUrl({
			url: `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
			method: "GET",
			contentType: "application/json",
			headers: {
				"Content-Type": "application/json",
				"Shortcut-Token": this._apiToken,
			},
		});

		if (res.status === 200) {
			console.log(res.json);
			const data = res.json;
			return data;
		}
		throw new Error(`Error getting issue ${storyId}: ${res.status}`);
	}

	async getWorkflowStates(): Promise<Workflow[]> {
		const res = await requestUrl({
			url: `https://api.app.shortcut.com/api/v3/workflows`,
			method: "GET",
			contentType: "application/json",
			headers: {
				"Content-Type": "application/json",
				"Shortcut-Token": this._apiToken,
			},
		});

		if (res.status === 200) {
			const data = res.json;
			return data;
		}
		throw new Error(`Error getting workflows: ${res.status}`);
	}

	getWorkflowState(workflowStateId: number) {
		return this._workflowsStates[workflowStateId];
	}
}
