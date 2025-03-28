import {
	createTLStore,
	Editor,
	fileToBase64,
	TLAsset,
	TLInstanceId,
	TLRecord,
	TLStore,
} from '@tldraw/editor'
import {
	ID,
	MigrationFailureReason,
	MigrationResult,
	SerializedSchema,
	StoreSnapshot,
	UnknownRecord,
} from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLTranslationKey, ToastsContextType } from '@tldraw/ui'
import { exhaustiveSwitchError, Result } from '@tldraw/utils'
import { buildFromV1Document } from './buildFromV1Document'

/** @public */
export const TLDRAW_FILE_MIMETYPE = 'application/vnd.tldraw+json' as const

/** @public */
export const TLDRAW_FILE_EXTENSION = '.tldr' as const

// When incrementing this, you'll need to update parseTldrawJsonFile to handle
// both your new changes and the old file format
const LATEST_TLDRAW_FILE_FORMAT_VERSION = 1

/** @public */
export interface TldrawFile {
	tldrawFileFormatVersion: number
	schema: SerializedSchema
	records: UnknownRecord[]
}

const tldrawFileValidator: T.Validator<TldrawFile> = T.object({
	tldrawFileFormatVersion: T.nonZeroInteger,
	schema: T.object({
		schemaVersion: T.positiveInteger,
		storeVersion: T.positiveInteger,
		recordVersions: T.dict(
			T.string,
			T.object({
				version: T.positiveInteger,
				subTypeVersions: T.dict(T.string, T.positiveInteger).optional(),
				subTypeKey: T.string.optional(),
			})
		),
	}),
	records: T.arrayOf(
		T.object({
			id: T.string as T.Validator<ID<any>>,
			typeName: T.string,
		}).allowUnknownProperties()
	),
})

/** @public */
export function isV1File(data: any) {
	try {
		if (data.document?.version) {
			return true
		}
		return false
	} catch (e) {
		return false
	}
}

/** @public */
export type TldrawFileParseError =
	| { type: 'v1File'; data: any }
	| { type: 'notATldrawFile'; cause: unknown }
	| { type: 'fileFormatVersionTooNew'; version: number }
	| { type: 'migrationFailed'; reason: MigrationFailureReason }
	| { type: 'invalidRecords'; cause: unknown }

/** @public */
export function parseTldrawJsonFile({
	json,
	instanceId,
	store,
}: {
	store: TLStore
	json: string
	instanceId: TLInstanceId
}): Result<TLStore, TldrawFileParseError> {
	// first off, we parse .json file and check it matches the general shape of
	// a tldraw file
	let data
	try {
		data = tldrawFileValidator.validate(JSON.parse(json))
	} catch (e) {
		// could be a v1 file!
		try {
			data = JSON.parse(json)
			if (isV1File(data)) {
				return Result.err({ type: 'v1File', data })
			}
		} catch (e) {
			// noop
		}

		return Result.err({ type: 'notATldrawFile', cause: e })
	}

	// if the file format version isn't supported, we can't open it - it's
	// probably from a newer version of tldraw
	if (data.tldrawFileFormatVersion > LATEST_TLDRAW_FILE_FORMAT_VERSION) {
		return Result.err({
			type: 'fileFormatVersionTooNew',
			version: data.tldrawFileFormatVersion,
		})
	}

	// even if the file version is up to date, it might contain old-format
	// records. lets create a store with the records and migrate it to the
	// latest version
	let migrationResult: MigrationResult<StoreSnapshot<TLRecord>>
	try {
		const storeSnapshot = Object.fromEntries(data.records.map((r) => [r.id, r as TLRecord]))
		migrationResult = store.schema.migrateStoreSnapshot(storeSnapshot, data.schema)
	} catch (e) {
		// junk data in the migration
		return Result.err({ type: 'invalidRecords', cause: e })
	}
	// if the migration failed, we can't open the file
	if (migrationResult.type === 'error') {
		return Result.err({ type: 'migrationFailed', reason: migrationResult.reason })
	}

	// at this stage, the store should have records at the latest versions, so
	// we should be able to validate them. if any of the records at this stage
	// are invalid, we don't open the file
	try {
		return Result.ok(
			createTLStore({
				initialData: migrationResult.value,
				instanceId,
			})
		)
	} catch (e) {
		// junk data in the records (they're not validated yet!) could cause the
		// migrations to crash. We treat any throw from a migration as an
		// invalid record
		return Result.err({ type: 'invalidRecords', cause: e })
	}
}

/** @public */
export async function serializeTldrawJson(store: TLStore): Promise<string> {
	const recordsToSave: TLRecord[] = []
	for (const record of store.allRecords()) {
		switch (record.typeName) {
			case 'asset':
				if (
					record.type !== 'bookmark' &&
					record.props.src &&
					!record.props.src.startsWith('data:')
				) {
					let assetSrcToSave
					try {
						// try to save the asset as a base64 string
						assetSrcToSave = await fileToBase64(await (await fetch(record.props.src)).blob())
					} catch {
						// if that fails, just save the original src
						assetSrcToSave = record.props.src
					}

					recordsToSave.push({
						...record,
						props: {
							...record.props,
							src: assetSrcToSave,
						},
					} as TLAsset)
				} else {
					recordsToSave.push(record)
				}
				break
			default:
				recordsToSave.push(record)
				break
		}
	}

	return JSON.stringify({
		tldrawFileFormatVersion: LATEST_TLDRAW_FILE_FORMAT_VERSION,
		schema: store.schema.serialize(),
		records: recordsToSave,
	})
}

/** @public */
export async function serializeTldrawJsonBlob(store: TLStore): Promise<Blob> {
	return new Blob([await serializeTldrawJson(store)], { type: TLDRAW_FILE_MIMETYPE })
}

/** @internal */
export async function parseAndLoadDocument(
	editor: Editor,
	document: string,
	msg: (id: TLTranslationKey) => string,
	addToast: ToastsContextType['addToast'],
	onV1FileLoad?: () => void,
	forceDarkMode?: boolean
) {
	const parseFileResult = parseTldrawJsonFile({
		store: createTLStore(),
		json: document,
		instanceId: editor.instanceId,
	})
	if (!parseFileResult.ok) {
		let description
		switch (parseFileResult.error.type) {
			case 'notATldrawFile':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				reportError(parseFileResult.error.cause)
				description = msg('file-system.file-open-error.not-a-tldraw-file')
				break
			case 'fileFormatVersionTooNew':
				description = msg('file-system.file-open-error.file-format-version-too-new')
				break
			case 'migrationFailed':
				if (parseFileResult.error.reason === MigrationFailureReason.TargetVersionTooNew) {
					description = msg('file-system.file-open-error.file-format-version-too-new')
				} else {
					description = msg('file-system.file-open-error.generic-corrupted-file')
				}
				break
			case 'invalidRecords':
				editor.annotateError(parseFileResult.error.cause, {
					origin: 'file-system.open.parse',
					willCrashApp: false,
					tags: { parseErrorType: parseFileResult.error.type },
				})
				reportError(parseFileResult.error.cause)
				description = msg('file-system.file-open-error.generic-corrupted-file')
				break
			case 'v1File': {
				buildFromV1Document(editor, parseFileResult.error.data.document)
				onV1FileLoad?.()
				return
			}
			default:
				exhaustiveSwitchError(parseFileResult.error, 'type')
		}
		addToast({
			title: msg('file-system.file-open-error.title'),
			description,
		})

		return
	}

	// tldraw file contain the full state of the app,
	// including ephemeral data. it up to the opener to
	// decide what to restore and what to retain. Here, we
	// just restore everything, so if the user has opened
	// this file before they'll get their camera etc.
	// restored. we could change this in the future.
	editor.replaceStoreContentsWithRecordsForOtherDocument(parseFileResult.value.allRecords())

	if (forceDarkMode) editor.setDarkMode(true)
}
