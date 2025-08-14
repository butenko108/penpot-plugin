/**
 * Объединенные типы для Claude Analysis & Semantic Tagging Plugin
 * Содержит типы из обоих плагинов: Анализатор + Семантик
 */

// ==========================================
// ТИПЫ ИЗ АНАЛИЗАТОРА (Claude API)
// ==========================================

export interface ThemePluginEvent {
	type: "theme";
	content: string;
}

export interface SelectionChangeEvent {
	type: "selection-change";
	hasSelection: boolean;
	shapeInfo: ShapeInfo | null;
	savedAnalysis?: SavedAnalysis | null;
}

export interface ExportAndAnalyzeEvent {
	type: "export-and-analyze";
}

export interface ExportStartEvent {
	type: "export-start";
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

export interface SavedAnalysis {
	markdown: string;
	timestamp: number;
	shapeInfo: {
		name: string;
		type: string;
	};
}

// ==========================================
// ТИПЫ ИЗ AST
// ==========================================

export interface GenerateReactComponentStartMessage {
	type: "generate-react-component-start";
	data: {
		astData: string;
		shapeId: string;
	};
}

export interface GenerateASTMessage {
	type: "generate-ast";
	data: {
		htmlCode: string;
		cssCode: string;
		metaInfo: string;
		shapeId: string;
		shapeName: string;
	};
}

export interface SaveASTMessage {
	type: "save-ast";
	data: {
		astData: string;
		shapeId: string;
		metadata: {
			htmlOutput: string;
			cssOutput: string;
			metaInfo: string;
		};
	};
}

export interface ClearASTMessage {
	type: "clear-ast";
	shapeId: string;
}

export interface ASTGeneratedMessage {
	type: "ast-generated";
	data: {
		astData: any;
		success: boolean;
	};
}

export interface ASTErrorMessage {
	type: "ast-error";
	content: string;
}

export interface ASTLoadedMessage {
	type: "ast-loaded";
	data: {
		ast: string;
		timestamp: number;
	} | null;
}

// В секцию "ТИПЫ ИЗ AST" добавить:
export interface GenerateReactComponentMessage {
	type: "generate-react-component";
	data: {
		astData: string;
		shapeId: string;
	};
}

export interface SaveReactComponentMessage {
	type: "save-react-component";
	data: {
		componentCode: string;
		shapeId: string;
	};
}

export interface ClearReactComponentMessage {
	type: "clear-react-component";
	shapeId: string;
}

export interface ReactComponentGeneratedMessage {
	type: "react-component-generated";
	data: {
		componentCode: string;
		success: boolean;
	};
}

export interface ReactComponentErrorMessage {
	type: "react-component-error";
	content: string;
}

export interface ReactComponentLoadedMessage {
	type: "react-component-loaded";
	data: {
		componentCode: string;
		timestamp: number;
	} | null;
}

// ==========================================
// ТИПЫ ИЗ СЕМАНТИКА (Semantic Tagging)
// ==========================================

// Основные интерфейсы для тегирования
export interface TagData {
	tag: string;
	properties: Record<string, string>;
	elementId: string;
	elementName: string;
	elementType?: string;
	content?: string;
	imageUrl?: string;
	styles?: StylesData;
	layout?: LayoutData;
	children?: TagData[];
}

export interface StylesData {
	// Dimensions and positioning
	width?: string;
	height?: string;
	position?: string;
	top?: string;
	left?: string;
	right?: string;
	bottom?: string;
	zIndex?: string;

	// Colors and backgrounds
	backgroundColor?: string;
	backgroundImage?: string;
	background?: string;
	color?: string;

	// Typography
	fontFamily?: string;
	fontSize?: string;
	fontWeight?: string;
	fontStyle?: string;
	textAlign?: string;
	lineHeight?: string;
	letterSpacing?: string;
	textDecoration?: string;
	textTransform?: string;
	direction?: string;

	// Text behavior and layout
	whiteSpace?: string;
	overflowWrap?: string;
	webkitBackgroundClip?: string;
	webkitTextFillColor?: string;
	backgroundClip?: string;

	// Spacing
	margin?: string;
	marginTop?: string;
	marginRight?: string;
	marginBottom?: string;
	marginLeft?: string;
	padding?: string;
	paddingTop?: string;
	paddingRight?: string;
	paddingBottom?: string;
	paddingLeft?: string;

	// Flexbox and layout
	display?: string;
	flexDirection?: string;
	flexWrap?: string;
	justifyContent?: string;
	alignItems?: string;
	alignContent?: string;
	alignSelf?: string;
	flexGrow?: string;
	flexShrink?: string;
	flexBasis?: string;
	gap?: string;
	rowGap?: string;
	columnGap?: string;

	// Borders and effects
	border?: string;
	borderRadius?: string;
	boxShadow?: string;
	boxSizing?: string;

	// Transform and visual effects
	transform?: string;
	opacity?: string;
	visibility?: string;
	overflow?: string;
	filter?: string;
	mixBlendMode?: string;
}

export interface LayoutData {
	display?: string;
	flexDirection?: string;
	justifyContent?: string;
	alignItems?: string;
	gap?: string;
	gridTemplateColumns?: string;
	gridTemplateRows?: string;
}

export interface PositionData {
	x: number;
	y: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
}

export interface ExportMetadata {
	pluginName: string;
	version: string;
	exportDate: string;
	fileName: string;
	pageName: string;
}

export interface ExportData {
	metadata: ExportMetadata;
	tree: any[];
}

// ==========================================
// ОБЪЕДИНЕННЫЕ ТИПЫ ДЛЯ ОБЩИХ СООБЩЕНИЙ
// ==========================================

// Сообщения от Claude функциональности
export type ClaudePluginEvent =
	| ThemePluginEvent
	| SelectionChangeEvent
	| ExportAndAnalyzeEvent
	| ExportStartEvent
	| ExportAndAnalyzeCompleteEvent
	| CreateTextShapeEvent
	| ErrorEvent;

// Сообщения от Semantic функциональности
export interface GetSelectionMessage {
	type: "get-selection";
}

export interface ApplyTagMessage {
	type: "apply-tag";
	data: {
		tag: string;
		properties: Record<string, string>;
		elementIds: string[];
	};
}

export interface RemoveTagMessage {
	type: "remove-tag";
	data: {
		elementIds: string[];
	};
}

export interface ExportTagsMessage {
	type: "export-tags";
}

export interface AutoTagSelectionMessage {
	type: "auto-tag-selection";
	data: {
		elementIds: string[];
	};
}

export interface GenerateRichJsonMessage {
	type: "generate-rich-json";
}

export interface TagAppliedMessage {
	type: "tag-applied";
	data: TagData;
}

export interface TagRemovedMessage {
	type: "tag-removed";
	data: { elementId: string };
}

export interface TagsLoadedMessage {
	type: "tags-loaded";
	data: TagData[];
}

export interface ExportDataMessage {
	type: "export-data";
	data: ExportData;
}

export interface AutoTagCompleteMessage {
	type: "auto-tag-complete";
	data: {
		taggedCount: number;
		processedElements: string[];
	};
}

export interface RichJsonDataMessage {
	type: "rich-json-data";
	data: ExportData;
}

export interface SelectionUpdateMessage {
	type: "selection-update";
	data: Array<{
		id: string;
		name: string;
		type: string;
	}>;
}

export interface ThemeChangeMessage {
	type: "themechange";
	theme: string;
}

// Объединенный тип для всех сообщений плагина
export type PluginMessage =
	| ClaudePluginEvent
	| GetSelectionMessage
	| ApplyTagMessage
	| RemoveTagMessage
	| ExportTagsMessage
	| AutoTagSelectionMessage
	| GenerateRichJsonMessage
	| GenerateASTMessage
	| SaveASTMessage
	| ClearASTMessage
	| GenerateReactComponentMessage
	| SaveReactComponentMessage
	| ClearReactComponentMessage;

// Объединенный тип для всех сообщений от плагина к UI
export type PluginToUIMessage =
	| TagAppliedMessage
	| TagRemovedMessage
	| TagsLoadedMessage
	| ExportDataMessage
	| AutoTagCompleteMessage
	| RichJsonDataMessage
	| SelectionUpdateMessage
	| ThemeChangeMessage
	| ClaudePluginEvent
	| ASTGeneratedMessage
	| ASTErrorMessage
	| ASTLoadedMessage
	| ReactComponentGeneratedMessage
	| ReactComponentErrorMessage
	| ReactComponentLoadedMessage
	| GenerateReactComponentStartMessage;

// ==========================================
// ДОПОЛНИТЕЛЬНЫЕ ТИПЫ ДЛЯ КОДОГЕНЕРАЦИИ
// ==========================================

export interface CodeGeneratorNode {
	tag: string;
	elementName: string;
	attributes?: Record<string, string>;
	styles?: Record<string, string>;
	layout?: Record<string, string>;
	content?: string;
	children?: CodeGeneratorNode[];
}
