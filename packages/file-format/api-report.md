## API Report File for "@tldraw/file-format"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { Editor } from '@tldraw/editor';
import { MigrationFailureReason } from '@tldraw/tlstore';
import { Result } from '@tldraw/utils';
import { SerializedSchema } from '@tldraw/tlstore';
import { TLInstanceId } from '@tldraw/editor';
import { TLStore } from '@tldraw/editor';
import { TLTranslationKey } from '@tldraw/ui';
import { ToastsContextType } from '@tldraw/ui';
import { UnknownRecord } from '@tldraw/tlstore';

// @internal (undocumented)
export function buildFromV1Document(editor: Editor, document: LegacyTldrawDocument): void;

// @public (undocumented)
export function isV1File(data: any): boolean;

// @internal (undocumented)
export interface LegacyTldrawDocument {
    // (undocumented)
    assets: TDAssets;
    // (undocumented)
    id: string;
    // (undocumented)
    name: string;
    // (undocumented)
    pages: Record<string, TDPage>;
    // (undocumented)
    pageStates: Record<string, TLV1PageState>;
    // (undocumented)
    version: number;
}

// @internal (undocumented)
export function parseAndLoadDocument(editor: Editor, document: string, msg: (id: TLTranslationKey) => string, addToast: ToastsContextType['addToast'], onV1FileLoad?: () => void, forceDarkMode?: boolean): Promise<void>;

// @public (undocumented)
export function parseTldrawJsonFile({ json, instanceId, store, }: {
    store: TLStore;
    json: string;
    instanceId: TLInstanceId;
}): Result<TLStore, TldrawFileParseError>;

// @public (undocumented)
export function serializeTldrawJson(store: TLStore): Promise<string>;

// @public (undocumented)
export function serializeTldrawJsonBlob(store: TLStore): Promise<Blob>;

// @public (undocumented)
export const TLDRAW_FILE_EXTENSION: ".tldr";

// @public (undocumented)
export const TLDRAW_FILE_MIMETYPE: "application/vnd.tldraw+json";

// @public (undocumented)
export interface TldrawFile {
    // (undocumented)
    records: UnknownRecord[];
    // (undocumented)
    schema: SerializedSchema;
    // (undocumented)
    tldrawFileFormatVersion: number;
}

// @public (undocumented)
export type TldrawFileParseError = {
    type: 'fileFormatVersionTooNew';
    version: number;
} | {
    type: 'invalidRecords';
    cause: unknown;
} | {
    type: 'migrationFailed';
    reason: MigrationFailureReason;
} | {
    type: 'notATldrawFile';
    cause: unknown;
} | {
    type: 'v1File';
    data: any;
};

// (No @packageDocumentation comment for this package)

```
