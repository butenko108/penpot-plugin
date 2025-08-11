/**
 * Типы событий для плагина экспорта shape
 */

export interface ThemePluginEvent {
	type: "theme";
	content: string;
}

export interface SelectionChangeEvent {
	type: "selection-change";
	hasSelection: boolean;
	shapeInfo: ShapeInfo | null;
}

export interface ExportShapeEvent {
	type: "export-shape";
}

export interface ExportAndAnalyzeEvent {
	type: "export-and-analyze";
}

export interface ExportStartEvent {
	type: "export-start";
}

export interface ExportCompleteEvent {
	type: "export-complete";
	fileName: string;
	imageData: Uint8Array;
	shapeInfo: ShapeInfo;
}

export interface ExportAndAnalyzeCompleteEvent {
	type: "export-and-analyze-complete";
	fileName: string;
	imageData: Uint8Array;
	shapeInfo: ShapeInfo;
}

export interface CreateTextShapeEvent {
	type: "create-text-shape";
	analysisText: string;
	selectedShapeInfo: ShapeInfo;
}

export interface ErrorEvent {
	type: "error";
	content: string;
}

export interface ShapeInfo {
	id: string;
	name: string;
	width: number;
	height: number;
	type: string;
}

export type PluginMessageEvent =
	| ThemePluginEvent
	| SelectionChangeEvent
	| ExportShapeEvent
	| ExportAndAnalyzeEvent
	| ExportStartEvent
	| ExportCompleteEvent
	| ExportAndAnalyzeCompleteEvent
	| CreateTextShapeEvent
	| ErrorEvent;
