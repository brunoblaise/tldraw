import { createRecordType, Migrations, Store } from '@tldraw/tlstore'
import { structuredClone } from '@tldraw/utils'
import fs from 'fs'
import { imageAssetMigrations } from './assets/TLImageAsset'
import { videoAssetMigrations } from './assets/TLVideoAsset'
import { documentTypeMigrations } from './records/TLDocument'
import { instanceTypeMigrations, instanceTypeVersions } from './records/TLInstance'
import { instancePageStateMigrations } from './records/TLInstancePageState'
import { instancePresenceTypeMigrations } from './records/TLInstancePresence'
import { rootShapeTypeMigrations, TLShape } from './records/TLShape'
import { userDocumentTypeMigrations, userDocumentVersions } from './records/TLUserDocument'
import { storeMigrations, storeVersions } from './schema'
import { arrowShapeTypeMigrations } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrations } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrations } from './shapes/TLDrawShape'
import { embedShapeTypeMigrations } from './shapes/TLEmbedShape'
import { geoShapeTypeMigrations } from './shapes/TLGeoShape'
import { imageShapeTypeMigrations } from './shapes/TLImageShape'
import { noteShapeTypeMigrations } from './shapes/TLNoteShape'
import { textShapeTypeMigrations } from './shapes/TLTextShape'
import { videoShapeTypeMigrations } from './shapes/TLVideoShape'

const assetModules = fs
	.readdirSync('src/assets')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./assets/${f.slice(0, -3)}`)])
const shapeModules = fs
	.readdirSync('src/shapes')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./shapes/${f.slice(0, -3)}`)])
const recordModules = fs
	.readdirSync('src/records')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./records/${f.slice(0, -3)}`)])

const allModules = [
	...assetModules,
	...shapeModules,
	...recordModules,
	['schema.ts', require('./schema')],
]

const allMigrators: Array<{
	fileName: string
	version: number
	up: jest.SpyInstance
	down: jest.SpyInstance
}> = []

for (const [fileName, module] of allModules) {
	const migrationsKey = Object.keys(module).find((k) => k.endsWith('igrations'))

	if (!migrationsKey) continue

	const migrations: Migrations = module[migrationsKey]

	for (const version of Object.keys(migrations.migrators)) {
		const originalUp = migrations.migrators[version as any].up
		const originalDown = migrations.migrators[version as any].down
		const up = jest
			.spyOn(migrations.migrators[version as any], 'up')
			.mockImplementation((initialRecord) => {
				if (initialRecord instanceof Store) return originalUp(initialRecord)

				const clonedRecord = structuredClone(initialRecord)
				const result = originalUp(initialRecord)
				// mutations should never mutate their input
				expect(initialRecord).toEqual(clonedRecord)
				return result
			})
		const down = jest
			.spyOn(migrations.migrators[version as any], 'down')
			.mockImplementation((initialRecord) => {
				if (initialRecord instanceof Store) return originalDown(initialRecord)

				const clonedRecord = structuredClone(initialRecord)
				const result = originalDown(initialRecord)
				// mutations should never mutate their input
				expect(initialRecord).toEqual(clonedRecord)
				return result
			})
		allMigrators.push({
			fileName,
			version: Number(version),
			up,
			down,
		})
	}
}

test('all modules export migrations', () => {
	const modulesWithoutMigrations = allModules
		.filter(([, module]) => {
			return !Object.keys(module).find((k) => k.endsWith('igrations'))
		})
		.map(([fileName]) => fileName)

	// IF THIS LINE IS FAILING YOU NEED TO MAKE SURE THE MIGRATIONS ARE EXPORTED
	expect(modulesWithoutMigrations).toHaveLength(0)
})

/* ---  PUT YOUR MIGRATIONS TESTS BELOW HERE --- */

describe('TLVideoAsset AddIsAnimated', () => {
	const oldAsset = {
		id: '1',
		type: 'video',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'video',
			width: 100,
			height: 100,
			mimeType: 'video/mp4',
		},
	}

	const newAsset = {
		id: '1',
		type: 'video',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'video',
			width: 100,
			height: 100,
			mimeType: 'video/mp4',
			isAnimated: false,
		},
	}

	const { up, down } = videoAssetMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

describe('TLImageAsset AddIsAnimated', () => {
	const oldAsset = {
		id: '1',
		type: 'image',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'image',
			width: 100,
			height: 100,
			mimeType: 'image/gif',
		},
	}

	const newAsset = {
		id: '1',
		type: 'image',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'image',
			width: 100,
			height: 100,
			mimeType: 'image/gif',
			isAnimated: false,
		},
	}

	const { up, down } = imageAssetMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

const ShapeRecord = createRecordType('shape', {
	validator: { validate: (record) => record as TLShape },
	scope: 'document',
})

describe('Store removing Icon and Code shapes', () => {
	test('up works as expected', () => {
		const snapshot = Object.fromEntries(
			[
				ShapeRecord.create({
					type: 'icon',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'a' },
				} as any),
				ShapeRecord.create({
					type: 'icon',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'b' },
				} as any),
				ShapeRecord.create({
					type: 'code',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'c' },
				} as any),
				ShapeRecord.create({
					type: 'code',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'd' },
				} as any),
				ShapeRecord.create({
					type: 'geo',
					parentId: 'page:any',
					index: 'a0',
					props: { geo: 'rectangle', w: 1, h: 1, growY: 1, text: '' },
				} as any),
			].map((shape) => [shape.id, shape])
		)
		const fixed = storeMigrations.migrators[storeVersions.RemoveCodeAndIconShapeTypes].up(snapshot)
		expect(Object.entries(fixed)).toHaveLength(1)
	})

	test('down works as expected', () => {
		const snapshot = Object.fromEntries(
			[
				ShapeRecord.create({
					type: 'geo',
					parentId: 'page:any',
					index: 'a0',
					props: { geo: 'rectangle', name: 'e', w: 1, h: 1, growY: 1, text: '' },
				} as any),
			].map((shape) => [shape.id, shape])
		)

		storeMigrations.migrators[storeVersions.RemoveCodeAndIconShapeTypes].down(snapshot)
		expect(Object.entries(snapshot)).toHaveLength(1)
	})
})

describe('Adding export background', () => {
	const { up, down } = instanceTypeMigrations.migrators[1]
	test('up works as expected', () => {
		const before = {}
		const after = { exportBackground: true }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { exportBackground: true }
		const after = {}
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Removing dialogs from instance', () => {
	const { up, down } = instanceTypeMigrations.migrators[2]
	test('up works as expected', () => {
		const before = { dialog: null }
		const after = {}
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = {}
		const after = { dialog: null }
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Adding snap mode', () => {
	const { up, down } = userDocumentTypeMigrations.migrators[1]
	test('up works as expected', () => {
		const before = {}
		const after = { isSnapMode: false }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { isSnapMode: false }
		const after = {}
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Adding url props', () => {
	for (const [name, { up, down }] of [
		['video shape', videoShapeTypeMigrations.migrators[1]],
		['note shape', noteShapeTypeMigrations.migrators[1]],
		['geo shape', geoShapeTypeMigrations.migrators[1]],
		['image shape', imageShapeTypeMigrations.migrators[1]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: {} }
			const after = { props: { url: '' } }
			expect(up(before)).toStrictEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { url: '' } }
			const after = { props: {} }
			expect(down(before)).toStrictEqual(after)
		})
	}
})

describe('Bookmark null asset id', () => {
	const { up, down } = bookmarkShapeTypeMigrations.migrators[1]
	test('up works as expected', () => {
		const before = { props: {} }
		const after = { props: { assetId: null } }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { props: { assetId: null } }
		const after = { props: {} }
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Renaming asset props', () => {
	for (const [name, { up, down }] of [
		['image shape', imageAssetMigrations.migrators[2]],
		['video shape', videoAssetMigrations.migrators[2]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: { width: 100, height: 100 } }
			const after = { props: { w: 100, h: 100 } }
			expect(up(before)).toStrictEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { w: 100, h: 100 } }
			const after = { props: { width: 100, height: 100 } }
			expect(down(before)).toStrictEqual(after)
		})
	}
})

describe('Adding the missing isMobileMode', () => {
	const { up, down } = userDocumentTypeMigrations.migrators[2]
	test('up works as expected', () => {
		expect(up({})).toMatchObject({ isMobileMode: false })
		expect(up({ isMobileMode: true })).toMatchObject({ isMobileMode: true })
	})

	test('down works as expected', () => {
		expect(down({ isMobileMode: true })).toStrictEqual({})
		expect(down({ isMobileMode: false })).toStrictEqual({})
	})
})

describe('Adding instance.isToolLocked', () => {
	const { up, down } = instanceTypeMigrations.migrators[3]
	test('up works as expected', () => {
		expect(up({})).toMatchObject({ isToolLocked: false })
		expect(up({ isToolLocked: true })).toMatchObject({ isToolLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isToolLocked: true })).toStrictEqual({})
		expect(down({ isToolLocked: false })).toStrictEqual({})
	})
})

describe('Cleaning up junk data in instance.propsForNextShape', () => {
	const { up, down } = instanceTypeMigrations.migrators[4]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red', unknown: 'gone' } })).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})

	test('down works as expected', () => {
		const instance = { propsForNextShape: { color: 'red' } }
		expect(down(instance)).toBe(instance)
	})
})

describe('Generating original URL from embed URL in GenOriginalUrlInEmbed', () => {
	const { up, down } = embedShapeTypeMigrations.migrators[1]
	test('up works as expected', () => {
		expect(up({ props: { url: 'https://codepen.io/Rplus/embed/PWZYRM' } })).toEqual({
			props: {
				url: 'https://codepen.io/Rplus/pen/PWZYRM',
				tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
			},
		})
	})

	test('invalid up works as expected', () => {
		expect(up({ props: { url: 'https://example.com' } })).toEqual({
			props: {
				url: '',
				tmpOldUrl: 'https://example.com',
			},
		})
	})

	test('down works as expected', () => {
		const instance = {
			props: {
				url: 'https://codepen.io/Rplus/pen/PWZYRM',
				tmpOldUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
			},
		}
		expect(down(instance)).toEqual({ props: { url: 'https://codepen.io/Rplus/embed/PWZYRM' } })
	})

	test('invalid down works as expected', () => {
		const instance = {
			props: {
				url: 'https://example.com',
				tmpOldUrl: '',
			},
		}
		expect(down(instance)).toEqual({ props: { url: '' } })
	})
})

describe('Adding isPen prop', () => {
	const { up, down } = drawShapeTypeMigrations.migrators[1]

	test('up works as expected with a shape that is not a pen shape', () => {
		expect(
			up({
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 1, y: 1, z: 0.5 },
							],
						},
					],
				},
			})
		).toEqual({
			props: {
				isPen: false,
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 1, y: 1, z: 0.5 },
						],
					},
				],
			},
		})
	})

	test('up works as expected when converting to pen', () => {
		expect(
			up({
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.2315 },
								{ x: 1, y: 1, z: 0.2421 },
							],
						},
					],
				},
			})
		).toEqual({
			props: {
				isPen: true,
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.2315 },
							{ x: 1, y: 1, z: 0.2421 },
						],
					},
				],
			},
		})
	})

	test('down works as expected', () => {
		expect(down({ props: { isPen: false } })).toEqual({
			props: {},
		})
	})
})

describe('Adding isLocked prop', () => {
	const { up, down } = rootShapeTypeMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up({})).toEqual({ isLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isLocked: false })).toEqual({})
	})
})

describe('Adding labelColor prop to geo / arrow shapes', () => {
	for (const [name, { up, down }] of [
		['arrow shape', arrowShapeTypeMigrations.migrators[1]],
		['geo shape', geoShapeTypeMigrations.migrators[2]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { color: 'red' } })).toEqual({
				props: { color: 'red', labelColor: 'black' },
			})
		})

		test(`${name}: down works as expected`, () => {
			expect(down({ props: { color: 'red', labelColor: 'blue' } })).toEqual({
				props: { color: 'red' },
			})
		})
	}
})

describe('Adding labelColor prop to propsForNextShape', () => {
	const { up, down } = instanceTypeMigrations.migrators[5]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: { color: 'red', labelColor: 'black' },
		})
	})

	test('down works as expected', () => {
		expect(down({ propsForNextShape: { color: 'red', labelColor: 'blue' } })).toEqual({
			propsForNextShape: { color: 'red' },
		})
	})
})

describe('Adding croppingId to instancePageState', () => {
	const { up, down } = instancePageStateMigrations.migrators[1]
	test('up works as expected', () => {
		expect(up({})).toEqual({
			croppingId: null,
		})
	})

	test('down works as expected', () => {
		expect(down({ croppingId: null })).toEqual({})
	})
})

describe('Adding followingUserId prop to instance', () => {
	const { up, down } = instanceTypeMigrations.migrators[6]
	test('up works as expected', () => {
		expect(up({})).toEqual({ followingUserId: null })
	})

	test('down works as expected', () => {
		expect(down({ followingUserId: '123' })).toEqual({})
	})
})

describe('Removing align=justify from propsForNextShape', () => {
	const { up, down } = instanceTypeMigrations.migrators[7]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'black', align: 'justify' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'start' },
		})
		expect(up({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})

	test('down works as expected', () => {
		expect(down({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})
})

describe('Adding zoomBrush prop to instance', () => {
	const { up, down } = instanceTypeMigrations.migrators[8]
	test('up works as expected', () => {
		expect(up({})).toEqual({ zoomBrush: null })
	})

	test('down works as expected', () => {
		expect(down({ zoomBrush: { x: 1, y: 2, w: 3, h: 4 } })).toEqual({})
	})
})

describe('Removing align=justify from shape align props', () => {
	for (const [name, { up, down }] of [
		['text', textShapeTypeMigrations.migrators[1]],
		['note', noteShapeTypeMigrations.migrators[2]],
		['geo', geoShapeTypeMigrations.migrators[3]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { align: 'justify' } })).toEqual({
				props: { align: 'start' },
			})
			expect(up({ props: { align: 'end' } })).toEqual({
				props: { align: 'end' },
			})
		})

		test(`${name}: down works as expected`, () => {
			expect(down({ props: { align: 'start' } })).toEqual({
				props: { align: 'start' },
			})
		})
	}
})

describe('Add crop=null to image shapes', () => {
	const { up, down } = imageShapeTypeMigrations.migrators[2]
	test('up works as expected', () => {
		expect(up({ props: { w: 100 } })).toEqual({
			props: { w: 100, crop: null },
		})
	})

	test('down works as expected', () => {
		expect(down({ props: { w: 100, crop: null } })).toEqual({
			props: { w: 100 },
		})
	})
})

describe('Adding instance_presence to the schema', () => {
	const { up, down } = storeMigrations.migrators[storeVersions.AddInstancePresenceType]

	test('up works as expected', () => {
		expect(up({})).toEqual({})
	})
	test('down works as expected', () => {
		expect(
			down({
				'instance_presence:123': { id: 'instance_presence:123', typeName: 'instance_presence' },
				'instance:123': { id: 'instance:123', typeName: 'instance' },
			})
		).toEqual({
			'instance:123': { id: 'instance:123', typeName: 'instance' },
		})
	})
})

describe('Adding name to document', () => {
	const { up, down } = documentTypeMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up({})).toEqual({ name: '' })
	})

	test('down works as expected', () => {
		expect(down({ name: '' })).toEqual({})
	})
})

describe('Adding check-box to geo shape', () => {
	const { up, down } = geoShapeTypeMigrations.migrators[4]

	test('up works as expected', () => {
		expect(up({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
	})
	test('down works as expected', () => {
		expect(down({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
		expect(down({ props: { geo: 'check-box' } })).toEqual({ props: { geo: 'rectangle' } })
	})
})

describe('Add verticalAlign to geo shape', () => {
	const { up, down } = geoShapeTypeMigrations.migrators[5]

	test('up works as expected', () => {
		expect(up({ props: { type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse', verticalAlign: 'middle' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { verticalAlign: 'middle', type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse' },
		})
	})
})

describe('Add verticalAlign to props for next shape', () => {
	const { up, down } = instanceTypeMigrations.migrators[9]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: {
				color: 'red',
				verticalAlign: 'middle',
			},
		})
	})

	test('down works as expected', () => {
		const instance = { propsForNextShape: { color: 'red', verticalAlign: 'middle' } }
		expect(down(instance)).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})
})

describe('Migrate GeoShape legacy horizontal alignment', () => {
	const { up, down } = geoShapeTypeMigrations.migrators[6]

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', type: 'ellipse' } })).toEqual({
			props: { align: 'start-legacy', type: 'ellipse' },
		})
		expect(up({ props: { align: 'middle', type: 'ellipse' } })).toEqual({
			props: { align: 'middle-legacy', type: 'ellipse' },
		})
		expect(up({ props: { align: 'end', type: 'ellipse' } })).toEqual({
			props: { align: 'end-legacy', type: 'ellipse' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { align: 'start-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'start', type: 'ellipse' },
		})
		expect(down({ props: { align: 'middle-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'middle', type: 'ellipse' },
		})
		expect(down({ props: { align: 'end-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'end', type: 'ellipse' },
		})
	})
})

describe('Migrate NoteShape legacy horizontal alignment', () => {
	const { up, down } = noteShapeTypeMigrations.migrators[3]

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', color: 'red' } })).toEqual({
			props: { align: 'start-legacy', color: 'red' },
		})
		expect(up({ props: { align: 'middle', color: 'red' } })).toEqual({
			props: { align: 'middle-legacy', color: 'red' },
		})
		expect(up({ props: { align: 'end', color: 'red' } })).toEqual({
			props: { align: 'end-legacy', color: 'red' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { align: 'start-legacy', color: 'red' } })).toEqual({
			props: { align: 'start', color: 'red' },
		})
		expect(down({ props: { align: 'middle-legacy', color: 'red' } })).toEqual({
			props: { align: 'middle', color: 'red' },
		})
		expect(down({ props: { align: 'end-legacy', color: 'red' } })).toEqual({
			props: { align: 'end', color: 'red' },
		})
	})
})

describe('Removing isReadOnly from user_document', () => {
	const { up, down } = userDocumentTypeMigrations.migrators[userDocumentVersions.RemoveIsReadOnly]
	const prev = {
		id: 'user_document:123',
		typeName: 'user_document',
		userId: 'user:123',
		isReadOnly: false,
		isPenMode: false,
		isGridMode: false,
		isDarkMode: false,
		isMobileMode: false,
		isSnapMode: false,
		lastUpdatedPageId: null,
		lastUsedTabId: null,
	}

	const next = {
		id: 'user_document:123',
		typeName: 'user_document',
		userId: 'user:123',
		isPenMode: false,
		isGridMode: false,
		isDarkMode: false,
		isMobileMode: false,
		isSnapMode: false,
		lastUpdatedPageId: null,
		lastUsedTabId: null,
	}

	test('up removes the isReadOnly property', () => {
		expect(up(prev)).toEqual(next)
	})
	test('down adds the isReadOnly property', () => {
		expect(down(next)).toEqual(prev)
	})
})

describe('Adds delay to scribble', () => {
	const { up, down } = instanceTypeMigrations.migrators[10]

	test('up has no effect when scribble is null', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribble: null })
	})

	test('up adds the delay property', () => {
		expect(
			up({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
				delay: 0,
			},
		})
	})

	test('down has no effect when scribble is null', () => {
		expect(down({ scribble: null })).toEqual({ scribble: null })
	})

	test('removes the delay property', () => {
		expect(
			down({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
			},
		})
	})
})

describe('Adds delay to scribble', () => {
	const { up, down } = instancePresenceTypeMigrations.migrators[1]

	test('up has no effect when scribble is null', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribble: null })
	})

	test('up adds the delay property', () => {
		expect(
			up({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
				delay: 0,
			},
		})
	})

	test('down has no effect when scribble is null', () => {
		expect(down({ scribble: null })).toEqual({ scribble: null })
	})

	test('removes the delay property', () => {
		expect(
			down({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
			},
		})
	})
})

describe('user config refactor', () => {
	test('removes user and user_presence types from snapshots', () => {
		const { up, down } =
			storeMigrations.migrators[storeVersions.RemoveTLUserAndPresenceAndAddPointer]

		const prevSnapshot = {
			'user:123': {
				id: 'user:123',
				typeName: 'user',
			},
			'user_presence:123': {
				id: 'user_presence:123',
				typeName: 'user_presence',
			},
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		const nextSnapshot = {
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		// up removes the user and user_presence types
		expect(up(prevSnapshot)).toEqual(nextSnapshot)
		// down cannot add them back so it should be a no-op
		expect(
			down({
				...nextSnapshot,
				'pointer:134': {
					id: 'pointer:134',
					typeName: 'pointer',
				},
			})
		).toEqual(nextSnapshot)
	})

	test('removes userId from the instance state', () => {
		const { up, down } = instanceTypeMigrations.migrators[instanceTypeVersions.RemoveUserId]

		const prev = {
			id: 'instance:123',
			typeName: 'instance',
			userId: 'user:123',
		}

		const next = {
			id: 'instance:123',
			typeName: 'instance',
		}

		expect(up(prev)).toEqual(next)
		// it cannot be added back so it should add some meaningless id in there
		// in practice, because we bumped the store version, this down migrator will never be used
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "id": "instance:123",
		  "typeName": "instance",
		  "userId": "user:none",
		}
	`)
	})

	test('removes userId and isDarkMode from TLUserDocument', () => {
		const { up, down } =
			userDocumentTypeMigrations.migrators[userDocumentVersions.RemoveUserIdAndIsDarkMode]

		const prev = {
			id: 'user_document:123',
			typeName: 'user_document',
			userId: 'user:123',
			isDarkMode: false,
			isGridMode: false,
		}
		const next = {
			id: 'user_document:123',
			typeName: 'user_document',
			isGridMode: false,
		}

		expect(up(prev)).toEqual(next)
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "id": "user_document:123",
		  "isDarkMode": false,
		  "isGridMode": false,
		  "typeName": "user_document",
		  "userId": "user:none",
		}
	`)
	})
})

/* ---  PUT YOUR MIGRATIONS TESTS ABOVE HERE --- */

for (const migrator of allMigrators) {
	test(`[${migrator.fileName} v${migrator.version}] up and down migrations have both been tested`, () => {
		expect(migrator.up).toHaveBeenCalled()
		expect(migrator.down).toHaveBeenCalled()
	})
}
